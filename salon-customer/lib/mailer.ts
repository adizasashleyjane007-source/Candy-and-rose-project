import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Validates and retrieves server-side SMTP configuration from environment variables.
 * Credentials are kept strictly server-side and never exposed to the client.
 */
export function getSMTPConfig() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true"; // false for port 587 (STARTTLS)
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || "";
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "";
  const from = process.env.SMTP_FROM || `"Candy & Rose Salon" <${user}>`;

  const isConfigured = Boolean(user && pass);

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    isConfigured,
  };
}

// Singleton transporter instance to reuse TCP/TLS connections
let transporterInstance: Transporter | null = null;

/**
 * Creates or retrieves the singleton Nodemailer SMTP transporter.
 * Uses Google's Gmail SMTP (smtp.gmail.com:587) with STARTTLS.
 */
export function getMailTransporter(): Transporter {
  if (transporterInstance) {
    return transporterInstance;
  }

  const config = getSMTPConfig();

  if (!config.isConfigured) {
    console.warn(
      "[SMTP WARNING] SMTP_USER or SMTP_PASS environment variables are missing. Outbound email delivery will fail until configured."
    );
  }

  transporterInstance = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // false for 587
    requireTLS: true, // enforce STARTTLS
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: true,
    },
  });

  return transporterInstance;
}

/**
 * Verifies SMTP connection health with the mail server.
 */
export async function verifySMTPConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const config = getSMTPConfig();
    if (!config.isConfigured) {
      return {
        success: false,
        message: "SMTP credentials (SMTP_USER / SMTP_PASS) are not configured in environment variables.",
      };
    }

    const transporter = getMailTransporter();
    await transporter.verify();
    return {
      success: true,
      message: `Successfully connected to Gmail SMTP (${config.host}:${config.port}).`,
    };
  } catch (error: any) {
    console.error("[SMTP ERROR] Connection verification failed:", error?.message || error);
    return {
      success: false,
      message: error?.message || "Failed to verify SMTP connection.",
    };
  }
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Sends an email using the verified Gmail SMTP transporter.
 */
export async function sendMail(options: SendMailOptions) {
  const config = getSMTPConfig();

  if (!config.isConfigured) {
    throw new Error("SMTP credentials are not configured on the server.");
  }

  // Basic recipient validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!options.to || !emailRegex.test(options.to)) {
    throw new Error(`Invalid recipient email address: ${options.to}`);
  }

  const transporter = getMailTransporter();

  const mailOptions = {
    from: config.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ""),
    replyTo: options.replyTo,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

export interface TrackedEmailOptions extends SendMailOptions {
  supabase: SupabaseClient;
  eventType: string;
  referenceId: string;
  idempotencyKey: string;
  lockDurationSeconds?: number;
}

export interface TrackedEmailResult {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  messageId?: string;
  error?: string;
}

/**
 * Sends an email backed by persistent PostgreSQL notification tracking in Supabase.
 * - Atomically claims row via claim_email_notification RPC.
 * - Skips already Sent notifications and actively locked claims.
 * - Records Uncertain status if network drops during transmission (never auto-retried).
 * - Updates status to Sent only after SMTP provider returns 250 OK.
 */
export async function sendTrackedEmail(options: TrackedEmailOptions): Promise<TrackedEmailResult> {
  const {
    supabase,
    eventType,
    referenceId,
    idempotencyKey,
    lockDurationSeconds = 120,
    ...mailOptions
  } = options;

  // 1. Atomic claim check via PostgreSQL procedure
  const { data: claimData, error: claimError } = await supabase.rpc("claim_email_notification", {
    p_idempotency_key: idempotencyKey,
    p_event_type: eventType,
    p_reference_id: referenceId,
    p_recipient_email: mailOptions.to,
    p_lock_duration_seconds: lockDurationSeconds,
  });

  if (claimError) {
    console.error("[TRACKED EMAIL] Failed to execute claim RPC:", claimError.message);
    return {
      success: false,
      error: `Claim verification failed: ${claimError.message}`,
    };
  }

  if (!claimData?.claimed) {
    console.log(
      `[TRACKED EMAIL] Dispatch skipped for ${idempotencyKey}. Reason: ${claimData?.reason}`
    );
    return {
      success: true,
      skipped: true,
      reason: claimData?.reason || "Skipped by idempotency policy",
    };
  }

  // 2. Dispatch via Gmail SMTP
  try {
    const info = await sendMail(mailOptions);

    // 3. Mark as Sent
    await supabase.rpc("update_email_notification_status", {
      p_idempotency_key: idempotencyKey,
      p_status: "Sent",
      p_clear_lock: true,
    });

    console.log(`[TRACKED EMAIL] Sent successfully: ${idempotencyKey} (MessageId: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    const isTimeoutOrNetwork =
      /timeout|ETIMEDOUT|ECONNRESET|ECONNABORTED|socket hang up/i.test(errorMessage);

    if (isTimeoutOrNetwork) {
      // 4. Mark as Uncertain - socket broke after data began, message may be queued by Gmail
      console.warn(
        `[TRACKED EMAIL UNCERTAIN] Socket timeout during dispatch for ${idempotencyKey}: ${errorMessage}`
      );
      await supabase.rpc("update_email_notification_status", {
        p_idempotency_key: idempotencyKey,
        p_status: "Uncertain",
        p_error_message: `Uncertain SMTP outcome: ${errorMessage}`,
        p_clear_lock: true,
      });

      return {
        success: false,
        error: "SMTP delivery outcome is uncertain due to socket timeout. Record marked for admin review.",
      };
    }

    // 5. Definite failure (e.g. invalid recipient, auth error)
    console.error(`[TRACKED EMAIL FAILED] Error dispatching ${idempotencyKey}:`, errorMessage);
    await supabase.rpc("update_email_notification_status", {
      p_idempotency_key: idempotencyKey,
      p_status: "Failed",
      p_error_message: errorMessage,
      p_clear_lock: true,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}
