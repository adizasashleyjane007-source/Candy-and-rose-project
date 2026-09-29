import { NextResponse } from "next/server";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { appointmentId } = body;

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
      .single();

    if (aptError || !appointment) {
      console.error("❌ Appointment not found for receipt:", aptError);
      return NextResponse.json(
        { success: false, message: "Appointment record not found.", error: aptError?.message },
        { status: 404 }
      );
    }

    // 2. Retrieve customer's registered email strictly from the customers table
    let customerEmail: string | null = appointment.customers?.email || null;
    let customerName: string = appointment.customers?.name || appointment.customer_name || "Valued Customer";
    let customerId: string = appointment.customers?.id || appointment.customer_id || "N/A";

    // If relation embed was null or email missing, query customers table strictly by appointment.customer_id
    if ((!customerEmail || customerEmail.trim() === "") && appointment.customer_id) {
      const { data: customerRecord } = await supabase
        .from("customers")
        .select("id, name, email")
        .eq("id", appointment.customer_id)
        .maybeSingle();

      if (customerRecord) {
        if (customerRecord.email) customerEmail = customerRecord.email;
        if (customerRecord.name) customerName = customerRecord.name;
        if (customerRecord.id) customerId = customerRecord.id;
      }
    }

    // Server-side logging verifying exact customer email recipient
    console.log(`[RECEIPT] Appointment ID: ${appointmentId}`);
    console.log(`[RECEIPT] Customer ID: ${customerId}`);
    console.log(`[RECEIPT] Customer Name: ${customerName}`);
    console.log(`[RECEIPT] Customer Email: ${customerEmail || "NONE"}`);
    console.log(`[RECEIPT] Starting receipt request`);

    // Customer email validation
    if (!customerEmail || typeof customerEmail !== "string" || !customerEmail.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          code: "CUSTOMER_EMAIL_MISSING",
          message: "This customer does not have a registered email address.",
        },
        { status: 400 }
      );
    }

    // 5. Fetch billing record if available
    const { data: billingRecord } = await supabase
      .from("billing")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 6. Gather receipt metrics
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
    const taxAmount = 0;
    const totalPaid = Number(billingRecord?.amount || servicePrice);
    const cashReceived = Number(billingRecord?.cash_received || totalPaid);
    const changeAmount = Math.max(0, cashReceived - totalPaid);

    const isCash = paymentMethod.toLowerCase() === "cash";

    // Build HTML Email
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
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">${paymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Service Price:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">₱${servicePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;">Tax:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">₱${taxAmount.toFixed(2)}</td>
            </tr>
            <tr style="border-top: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 10px 0; color: #111827; font-weight: 700; font-size: 16px;">Total Paid:</td>
              <td style="padding: 10px 0; text-align: right; font-weight: 800; font-size: 18px; color: #db2777;">₱${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ${
              isCash
                ? `
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Amount Received:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #111827;">₱${cashReceived.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Change:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #059669;">₱${changeAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              `
                : ""
            }
          </table>
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

    console.log(`[RECEIPT] Preparing email for target TO: ${customerEmail}`);
    console.log(`[RECEIPT] Sending email...`);

    // PROVIDER SELECTION:
    // Option A: Gmail SMTP via Nodemailer (if SMTP_USER and SMTP_PASSWORD exist in .env.local)
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD;

    if (smtpUser && smtpPass) {
      console.log(`[RECEIPT] Using Gmail SMTP provider (${smtpUser})`);
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"Candy & Rose" <${smtpUser}>`,
        to: customerEmail,
        subject: "Candy & Rose - Payment Receipt",
        html: htmlEmail,
      });

      console.log(`[RECEIPT] Gmail SMTP provider response: accepted by SMTP server (MessageId: ${info.messageId})`);

      if (billingRecord?.id) {
        try {
          await supabase.from("billing").update({
            notes: `${billingRecord.notes || 'Payment'} | Receipt sent to ${customerEmail} via SMTP at ${new Date().toISOString()}`,
          }).eq("id", billingRecord.id);
        } catch (tErr) {}
      }

      console.log(`[RECEIPT] Receipt send completed successfully.`);
      return NextResponse.json({
        success: true,
        message: "Receipt sent successfully.",
        messageId: info.messageId,
        email: customerEmail,
      });
    }

    // Option B: Resend API Provider
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_your_api_key_here") {
      console.error("❌ ERROR: No email provider credentials configured (RESEND_API_KEY or SMTP_USER missing).");
      return NextResponse.json(
        {
          success: false,
          message: "Unable to send receipt.",
          error: "Email service is not configured on the server.",
        },
        { status: 500 }
      );
    }

    console.log(`[RECEIPT] Using Resend API provider`);
    const { data: resendData, error: sendError } = await resend.emails.send({
      from: "Candy & Rose <onboarding@resend.dev>",
      to: [customerEmail],
      subject: "Candy & Rose - Payment Receipt",
      html: htmlEmail,
    });

    if (sendError) {
      console.error(`❌ Resend API Error sending receipt to ${customerEmail}:`, sendError.message);
      return NextResponse.json(
        {
          success: false,
          message: "Unable to send receipt.",
          error: sendError.message,
        },
        { status: 500 }
      );
    }

    console.log(`[RECEIPT] Resend provider response: ${resendData?.id}`);

    if (billingRecord?.id) {
      try {
        await supabase.from("billing").update({
          notes: `${billingRecord.notes || 'Payment'} | Receipt sent to ${customerEmail} at ${new Date().toISOString()}`,
        }).eq("id", billingRecord.id);
      } catch (tErr) {}
    }

    console.log(`[RECEIPT] Receipt send completed successfully.`);
    return NextResponse.json({
      success: true,
      message: "Receipt sent successfully.",
      messageId: resendData?.id,
      email: customerEmail,
    });
  } catch (err: any) {
    console.error("❌ Server error in /api/send-receipt:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to send receipt.",
        error: err?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}


