import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReceiptPDFBuffer } from "@/lib/receipt-pdf";
import { sendTrackedEmail, getSMTPConfig } from "@/lib/mailer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { appointmentId, requestId } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { success: false, message: "Appointment ID is required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Fetch authoritative appointment data from DB with relations
    const { data: appointment, error: aptError } = await supabase
      .from("appointments")
      .select(`
        *,
        customers(id, name, email, phone),
        staff(name),
        services(name, price)
      `)
      .eq("id", appointmentId)
      .maybeSingle();

    // Database/query failure is reported separately from a missing appointment
    if (aptError) {
      console.error("❌ Appointment lookup query failed for receipt:", aptError.message);
      return NextResponse.json(
        {
          success: false,
          code: "APPOINTMENT_LOOKUP_FAILED",
          message: "Unable to retrieve the appointment record. Please try again.",
        },
        { status: 500 }
      );
    }

    if (!appointment) {
      return NextResponse.json(
        { success: false, code: "APPOINTMENT_NOT_FOUND", message: "Appointment record not found." },
        { status: 404 }
      );
    }

    // 2. Retrieve customer's registered email strictly from the customers table
    let customerEmail: string | null = appointment.customers?.email || null;
    let customerName: string = appointment.customers?.name || appointment.customer_name || "Valued Customer";
    let customerId: string = appointment.customers?.id || appointment.customer_id || "N/A";

    // If relation embed was null or email missing, query customers table strictly by appointment.customer_id
    if ((!customerEmail || customerEmail.trim() === "") && appointment.customer_id) {
      const { data: customerRecord, error: customerError } = await supabase
        .from("customers")
        .select("id, name, email")
        .eq("id", appointment.customer_id)
        .maybeSingle();

      // Database/query failure is reported separately from a missing customer record
      if (customerError) {
        console.error("❌ Customer lookup query failed for receipt:", customerError.message);
        return NextResponse.json(
          {
            success: false,
            code: "CUSTOMER_LOOKUP_FAILED",
            message: "Unable to retrieve the customer record. Please try again.",
          },
          { status: 500 }
        );
      }

      if (customerRecord) {
        if (customerRecord.email) customerEmail = customerRecord.email;
        if (customerRecord.name) customerName = customerRecord.name;
        if (customerRecord.id) customerId = customerRecord.id;
      }
    }

    // Normalize the recipient email retrieved from the customer record
    const normalizedEmail =
      typeof customerEmail === "string" ? customerEmail.trim().toLowerCase() : "";

    // Server-side logging (recipient masked)
    const maskedEmail = normalizedEmail
      ? normalizedEmail.replace(/^(.{2}).*(@.*)$/, "$1***$2")
      : "NONE";
    console.log(`[RECEIPT] Appointment ID: ${appointmentId}`);
    console.log(`[RECEIPT] Customer ID: ${customerId}`);
    console.log(`[RECEIPT] Customer Email: ${maskedEmail}`);

    // Missing recipient: stop before any SMTP connection or tracking record is created
    if (!normalizedEmail) {
      return NextResponse.json(
        {
          success: false,
          code: "CUSTOMER_EMAIL_MISSING",
          message: "This customer does not have a registered email address.",
        },
        { status: 400 }
      );
    }

    // Invalid recipient format: stop before any SMTP connection or tracking record is created
    const EMAIL_FORMAT = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
    if (normalizedEmail.length > 254 || !EMAIL_FORMAT.test(normalizedEmail)) {
      return NextResponse.json(
        {
          success: false,
          code: "CUSTOMER_EMAIL_INVALID",
          message: "This customer's registered email address is invalid. Please update the customer record.",
        },
        { status: 400 }
      );
    }

    customerEmail = normalizedEmail;

    // 3. Fetch billing record if available
    const { data: billingRecord } = await supabase
      .from("billing")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Gather receipt metrics
    const serviceName = appointment.service_name || appointment.services?.name || "Salon Service";
    const staffName = appointment.staff?.name || appointment.staff_name || "Candy & Rose Specialist";

    let formattedDate = appointment.appointment_date || appointment.date || "Today";
    if (formattedDate && !isNaN(Date.parse(formattedDate))) {
      formattedDate = new Date(formattedDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    const appointmentTime = appointment.appointment_time || appointment.time || "Scheduled Time";

    const paymentMethod = billingRecord?.payment_method || appointment.payment_method || "Cash";
    const servicePrice = Number(appointment.price || appointment.services?.price || 0);
    const totalPaid = Number(billingRecord?.amount ?? servicePrice);
    const loyaltyDiscountAmount = Number(
      billingRecord?.loyalty_discount_amount ?? appointment.loyalty_discount_amount ?? 0
    );
    const originalSubtotal = Number(
      billingRecord?.original_amount ??
        appointment.original_amount ??
        (loyaltyDiscountAmount > 0 ? totalPaid + loyaltyDiscountAmount : totalPaid)
    );
    const loyaltyRewardDescription =
      billingRecord?.loyalty_reward_description ||
      appointment.loyalty_reward_description ||
      null;
    const cashReceived = Number(billingRecord?.cash_received || totalPaid);
    const changeAmount = Math.max(0, cashReceived - totalPaid);

    // Build authoritative HTML Email
    const htmlEmail = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; border: 1px solid #fbcfe8; border-radius: 24px; background-color: #ffffff; color: #1f2937;">
        <!-- Brand Header -->
        <div style="text-align: center; margin-bottom: 28px;">
          <h1 style="color: #ec4899; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Candy & Rose</h1>
          <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Beauty Salon</p>
        </div>

        <!-- Greeting Box -->
        <div style="background-color: #fff1f2; padding: 20px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #fce7f3; text-align: center;">
          <h2 style="color: #db2777; margin: 0 0 6px 0; font-size: 20px; font-weight: 700;">PAYMENT RECEIPT</h2>
          <p style="color: #374151; margin: 8px 0 0 0; font-size: 15px; font-weight: 600;">Dear ${customerName},</p>
          <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 14px;">Your payment has been successfully received.</p>
        </div>

        <!-- Appointment Details Section -->
        <div style="margin-bottom: 24px;">
          <h3 style="color: #111827; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0; border-bottom: 2px solid #fecdd3; padding-bottom: 6px;">
            Appointment Details
          </h3>
          <table style="width: 100%; font-size: 14px; color: #374151; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Customer:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Service:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Staff:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">${staffName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Date:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Time:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">${appointmentTime}</td>
            </tr>
          </table>
        </div>

        <!-- Payment Details Section -->
        <div style="margin-bottom: 28px;">
          <h3 style="color: #111827; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0; border-bottom: 2px solid #fecdd3; padding-bottom: 6px;">
            Payment Details
          </h3>
          <table style="width: 100%; font-size: 14px; color: #374151; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Payment Method:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827; text-transform: uppercase;">${paymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Subtotal:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">PHP ${originalSubtotal.toFixed(2)}</td>
            </tr>
            ${
              loyaltyDiscountAmount > 0
                ? `
            <tr>
              <td style="padding: 6px 0; color: #db2777; font-weight: 600;">Loyalty Discount${loyaltyRewardDescription ? ` (${loyaltyRewardDescription})` : ""}:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #db2777;">- PHP ${loyaltyDiscountAmount.toFixed(2)}</td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Total Paid:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #db2777; font-size: 16px;">PHP ${totalPaid.toFixed(2)}</td>
            </tr>
            ${
              paymentMethod.toLowerCase() === "cash" && cashReceived > 0
                ? `
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Cash Received:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">PHP ${cashReceived.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Change:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">PHP ${changeAmount.toFixed(2)}</td>
            </tr>`
                : ""
            }
          </table>
        </div>

        <!-- Note on Attachment -->
        <div style="background-color: #fdf2f8; padding: 14px; border-radius: 12px; border: 1px dashed #f472b6; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #9d174d; font-weight: 500;">
            📎 An official copy of your Sales Invoice (PDF) is attached to this email.
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 32px; padding-top: 20px; border-top: 1px solid #fce7f3;">
          <p style="color: #374151; font-size: 15px; font-weight: 700; margin: 0 0 4px 0;">Thank you for booking with Candy & Rose!</p>
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 16px 0;">We look forward to seeing you again.</p>
          <p style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin: 0;">
            Candy & Rose
          </p>
        </div>
      </div>
    `;

    console.log(`[RECEIPT] Preparing email for target TO: ${maskedEmail}`);
    console.log(`[RECEIPT] Generating authoritative PDF receipt attachment via existing receipt-pdf.ts...`);

    // Fetch salon metadata if available in settings, or use standard defaults
    const { data: salonSettings } = await supabase
      .from("salon_settings")
      .select("value")
      .eq("key", "salon_info")
      .maybeSingle();

    const salonInfo = salonSettings?.value || {
      name: "Candy And Rose Salon",
      address: "Blk and Lot, Dasmarinas Cavite",
      phone: "032-123-4567",
      email: "candyandroses@gmail.com",
    };

    // Generate authoritative PDF receipt matching dashboard layout
    const pdfBuffer = generateReceiptPDFBuffer({
      salonInfo,
      customerName,
      staffName,
      dateStr: formattedDate,
      timeStr: appointmentTime,
      serviceName,
      price: totalPaid,
      originalSubtotal,
      loyaltyDiscountAmount,
      loyaltyRewardDescription,
      paymentMethod,
      cashReceived,
      change: changeAmount,
    });

    // Check SMTP configuration
    const smtpConfig = getSMTPConfig();
    if (!smtpConfig.isConfigured) {
      console.error("❌ ERROR: Google Gmail SMTP credentials are not configured in environment variables.");
      return NextResponse.json(
        {
          success: false,
          code: "SMTP_NOT_CONFIGURED",
          message: "Email service is not configured on the server. Please set SMTP_USER and SMTP_PASS (Gmail App Password).",
        },
        { status: 500 }
      );
    }

    // Deterministic action key / request key for idempotency
    const billingId = billingRecord?.id || appointmentId;
    const actionKey = requestId || `${billingId}_${Date.now()}`;
    const idempotencyKey = `billing_receipt:${billingId}:${actionKey}`;

    console.log(`[RECEIPT] Sending email copy via Gmail SMTP to ${maskedEmail} (Key: ${idempotencyKey})...`);

    // Send tracked email with PDF attachment via Gmail SMTP
    const dispatchResult = await sendTrackedEmail({
      supabase,
      to: customerEmail,
      subject: "Candy & Rose - Payment Receipt",
      html: htmlEmail,
      eventType: "billing_receipt",
      referenceId: billingId,
      idempotencyKey,
      attachments: [
        {
          filename: "Candy_and_Rose_Receipt.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    if (!dispatchResult.success && !dispatchResult.skipped) {
      console.error(`❌ Gmail SMTP Error sending receipt to ${maskedEmail}:`, dispatchResult.error);
      return NextResponse.json(
        {
          success: false,
          message: dispatchResult.error || "Unable to send receipt.",
          error: dispatchResult.error,
        },
        { status: 500 }
      );
    }

    console.log(`[RECEIPT] Gmail SMTP dispatch succeeded (MessageId: ${dispatchResult.messageId || "N/A"})`);

    // Log receipt dispatch in billing record without modifying appointment statuses
    if (billingRecord?.id) {
      try {
        await supabase
          .from("billing")
          .update({
            notes: `${billingRecord.notes || "Payment"} | Receipt sent to ${customerEmail} via Gmail SMTP at ${new Date().toISOString()}`,
          })
          .eq("id", billingRecord.id);
      } catch (tErr) {
        console.warn("Could not update billing record note:", tErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: dispatchResult.skipped
        ? "Receipt was already sent for this transaction."
        : "Receipt sent successfully.",
      messageId: dispatchResult.messageId,
      email: customerEmail,
      skipped: dispatchResult.skipped,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error";
    console.error("❌ Server error in /api/send-receipt:", errorMsg);
    return NextResponse.json(
      {
        success: false,
        message: errorMsg,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
