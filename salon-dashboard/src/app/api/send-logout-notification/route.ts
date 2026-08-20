import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, name, logoutTime } = await request.json();
    console.log("-----------------------------------------");
    console.log("🔒 SECURITY NOTIFICATION: Admin Logout");
    console.log("Recipient:", email);

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_your_api_key_here") {
      console.error("❌ ERROR: RESEND_API_KEY is not configured.");
      return NextResponse.json({ 
        error: "Email service not configured"
      }, { status: 500 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Send the email via Resend
    const { data, error } = await resend.emails.send({
      from: 'Candy & Rose <onboarding@resend.dev>',
      to: [email],
      subject: `🔒 Security Alert: Admin Logout Notification`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #fce7f3; border-radius: 24px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; background-color: #fff1f2; padding: 12px; border-radius: 50%;">
              <span style="font-size: 24px;">🔒</span>
            </div>
          </div>
          <h2 style="color: #db2777; text-align: center; font-size: 22px; margin-top: 10px;">Account Logout Alert</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
            Hello <strong>${name}</strong>, <br />
            You have successfully logged out of the <strong>Candy & Rose Salon Dashboard</strong>.
          </p>
          <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Account:</td>
                <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Date & Time:</td>
                <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600; text-align: right;">${logoutTime}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 14px; color: #6b7280; font-weight: 500;">Status:</td>
                <td style="padding: 6px 0; font-size: 14px; color: #10b981; font-weight: 600; text-align: right;">Logged Out</td>
              </tr>
            </table>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.5;">
            If you did not initiate this logout, your session may have expired, or your account credentials might have been updated.
          </p>
          <hr style="border: none; border-top: 1px solid #fce7f3; margin: 25px 0;" />
          <p style="font-size: 10px; color: #d1d5db; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
            © 2026 Candy & Rose Salon • Security System
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("❌ Resend API Error:", error);
      return NextResponse.json({ 
        error: "Failed to send logout email", 
        details: error.message 
      }, { status: 500 });
    }

    console.log("✅ Logout email notification sent successfully to:", email);
    console.log("-----------------------------------------");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Server Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
