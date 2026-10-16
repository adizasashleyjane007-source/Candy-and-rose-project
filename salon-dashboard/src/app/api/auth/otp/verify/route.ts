import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const supabase = await createClient();

    // Find the latest unused, unexpired OTP for this email
    const { data: otpData, error: fetchError } = await supabase
      .from("admin_otps")
      .select("*")
      .ilike("email", cleanEmail)
      .eq("otp_code", cleanOtp)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !otpData) {
      console.warn("⚠️ OTP verification rejected: code not found or expired");
      return NextResponse.json(
        { error: "Invalid or expired security code" },
        { status: 400 }
      );
    }

    // Verify OTP belongs to the authenticated admin
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id !== otpData.user_id) {
      console.warn("🛡️ Security Alert: OTP user_id does not match active session user_id");
      return NextResponse.json(
        { error: "Security code does not match active session" },
        { status: 403 }
      );
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from("admin_otps")
      .update({ is_used: true })
      .eq("id", otpData.id);

    if (updateError) {
      console.error("⚠️ Error marking OTP as used:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update security code status. Please try again." },
        { status: 500 }
      );
    }

    // Set secure HTTP-only cookie indicating successful OTP verification
    const verifiedUserId = user?.id || otpData.user_id;
    const cookieStore = await cookies();
    cookieStore.set("admin_otp_verified", verifiedUserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Security verification successful",
    });
  } catch (err: any) {
    console.error("❌ OTP Verification Server Error:", err?.message || err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
