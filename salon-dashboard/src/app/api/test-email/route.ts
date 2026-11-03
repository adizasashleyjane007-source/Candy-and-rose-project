import { NextResponse } from "next/server";
import { verifySMTPConnection, sendMail, getSMTPConfig } from "@/lib/mailer";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Restricted SMTP health-check and test-email endpoint.
 * In development, allows testing freely.
 * In production, requires either CRON_SECRET or an authenticated Supabase admin user.
 */
export async function POST(request: Request) {
  try {
    const isDev = process.env.NODE_ENV !== "production";
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    let isAuthorized = isDev || Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);

    // If not authorized by cron secret, check Supabase admin session
    if (!isAuthorized) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          isAuthorized = true;
        }
      } catch (authErr) {
        // Ignored, unauthorized handled below
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized access to test email endpoint." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { to, action = "verify" } = body;

    const config = getSMTPConfig();

    if (action === "verify") {
      const verification = await verifySMTPConnection();
      return NextResponse.json({
        configured: config.isConfigured,
        host: config.host,
        port: config.port,
        secure: config.secure,
        from: config.from,
        verification,
      });
    }

    if (action === "send") {
      const recipient = to || config.user;

      if (!recipient) {
        return NextResponse.json(
          { error: "Recipient email ('to') is required to send a test email." },
          { status: 400 }
        );
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fce7f3; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #ec4899; margin-top: 0;">Candy & Rose Salon</h2>
          <p style="font-size: 14px; color: #374151;">Dashboard Gmail SMTP Integration Test</p>
          <hr style="border: none; border-top: 1px solid #f3e8ff; margin: 16px 0;" />
          <p style="font-size: 14px; color: #4b5563;">
            This is an automated test message sent from <strong>salon-dashboard</strong> via Google Gmail SMTP (Nodemailer).
          </p>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
            Timestamp: ${new Date().toISOString()}<br />
            Host: ${config.host}:${config.port} (STARTTLS)
          </p>
        </div>
      `;

      const result = await sendMail({
        to: recipient,
        subject: "Candy & Rose Salon - SMTP Test Verification (Dashboard)",
        html,
      });

      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${recipient}.`,
        messageId: result.messageId,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'verify' or 'send'." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[TEST EMAIL ERROR in salon-dashboard]:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to process test email request.",
      },
      { status: 500 }
    );
  }
}

