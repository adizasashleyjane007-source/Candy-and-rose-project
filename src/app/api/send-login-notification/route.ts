import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, name, loginTime, userId } = await request.json();
    console.log("-----------------------------------------");
    console.log("🔒 SECURITY NOTIFICATION: OTP Request");
    console.log("Recipient:", email);

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_your_api_key_here") {
      console.error("❌ ERROR: RESEND_API_KEY is not configured.");
      return NextResponse.json({ 
        error: "Email service not configured", 
        details: "Wait for the account owner to configure the security service."
      }, { status: 500 });
    }

    if (!email || !userId) {
      return NextResponse.json({ error: "Email and User ID are required" }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes session life

    // Store OTP in database
    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from("admin_otps")
      .insert({
        user_id: userId,
        email: email,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        is_used: false
      });

    if (dbError) {
      console.error("❌ Database error saving OTP:", dbError);
      return NextResponse.json({ error: "Failed to generate security code" }, { status: 500 });
    }

    // Send the email via Resend
    const { data, error } = await resend.emails.send({
      from: 'Candy & Rose <onboarding@resend.dev>',
      to: [email],
      subject: `Your Login Security Code: ${otpCode}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #fce7f3; border-radius: 24px; background-color: #ffffff;">
          <h2 style="color: #ec4899; text-align: center; font-size: 24px;">Security Verification</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
            A login attempt was made for your Administrator account. <br /> 
            Use the following code to complete your sign-in:
          </p>
          <div style="background-color: #fff1f2; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
            <span style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #db2777;">${otpCode}</span>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This security code will be valid for this session. <br />
            If you did not request this code, please secure your account immediately.
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
        error: "Failed to send OTP email", 
        details: error.message 
      }, { status: 500 });
    }

    console.log("✅ Security code sent successfully to:", email);
    console.log("-----------------------------------------");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Server Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
