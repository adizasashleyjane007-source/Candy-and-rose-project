import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Find the latest unused OTP for this email
    const { data: otpData, error: fetchError } = await supabase
      .from("admin_otps")
      .select("*")
      .eq("email", email)
      .eq("otp_code", otp)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpData) {
      console.error("OTP verification failed or expired:", fetchError);
      return NextResponse.json({ 
        error: "Invalid or expired security code" 
      }, { status: 400 });
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from("admin_otps")
      .update({ is_used: true })
      .eq("id", otpData.id);

    if (updateError) {
      console.error("Error marking OTP as used:", updateError);
    }

    // Set a secure cookie to indicate OTP verification success
    // This value must match the user ID for security
    const cookieStore = await cookies();
    cookieStore.set("admin_otp_verified", otpData.user_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return NextResponse.json({ 
      success: true, 
      message: "Security verification successful" 
    });
  } catch (err) {
    console.error("OTP Verification Server Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
