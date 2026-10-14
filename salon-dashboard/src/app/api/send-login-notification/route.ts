import { NextResponse } from "next/server";
import { sendAdminOtp } from "@/lib/auth-otp";

export async function POST(request: Request) {
  try {
    const { email, name, userId } = await request.json();

    if (!email || !userId) {
      return NextResponse.json({ error: "Email and User ID are required" }, { status: 400 });
    }

    const result = await sendAdminOtp({
      userId,
      email,
      name: name || "Administrator",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send security code" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Server Error in /api/send-login-notification:", err?.message || err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
