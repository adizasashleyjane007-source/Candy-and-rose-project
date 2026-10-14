import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

export async function sendAdminOtp({
  userId,
  email,
  name = "Administrator",
  supabaseClient,
}: {
  userId: string;
  email: string;
  name?: string;
  supabaseClient?: any;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === "re_your_api_key_here") {
      console.error("❌ ERROR: RESEND_API_KEY is not configured.");
      return { success: false, error: "Email service not configured" };
    }

    if (!email || !userId) {
      return { success: false, error: "Email and User ID are required" };
    }

    // Generate cryptographically random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes session life

    const normalizedEmail = email.trim().toLowerCase();

    const supabase = supabaseClient || (await createClient());
    const { error: dbError } = await supabase
      .from("admin_otps")
      .insert({
        user_id: userId,
        email: normalizedEmail,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        is_used: false,
      });

    if (dbError) {
      console.error("❌ Database error saving OTP:", dbError.message);
      return { success: false, error: "Failed to generate security code" };
    }

    const resend = new Resend(apiKey);
    const { error: resendError } = await resend.emails.send({
      from: "Candy & Rose <onboarding@resend.dev>",
      to: [email],
      subject: `Your Login Security Code: ${otpCode}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #fce7f3; border-radius: 24px; background-color: #ffffff;">
          <h2 style="color: #ec4899; text-align: center; font-size: 24px;">Security Verification</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;">
            A login attempt was made for your Administrator account (${name}). <br /> 
            Use the following code to complete your sign-in:
          </p>
          <div style="background-color: #fff1f2; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
            <span style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #db2777;">${otpCode}</span>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This security code will be valid for 10 minutes. <br />
            If you did not request this code, please secure your account immediately.
          </p>
          <hr style="border: none; border-top: 1px solid #fce7f3; margin: 25px 0;" />
          <p style="font-size: 10px; color: #d1d5db; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
            © 2026 Candy & Rose Salon • Security System
          </p>
        </div>
      `,
    });

    if (resendError) {
      console.error("❌ Resend API Error:", resendError.message);
      return { success: false, error: resendError.message || "Failed to send OTP email" };
    }

    const maskedEmail = `${email.slice(0, 3)}***@${email.split("@")[1] || ""}`;
    console.log("✅ Security code sent successfully to:", maskedEmail);
    return { success: true };
  } catch (err: any) {
    console.error("❌ Server error generating/sending OTP:", err?.message || err);
    return { success: false, error: err?.message || "Internal server error" };
  }
}
