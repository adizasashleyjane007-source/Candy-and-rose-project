import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Validates and sanitizes the `next` query parameter to prevent open-redirect vulnerabilities.
 * Only allows internal relative paths starting with a single `/`.
 */
function getSafeRedirectPath(rawNext: string | null): string {
  if (!rawNext) return "/";
  const trimmed = rawNext.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return "/";
  }
  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.origin !== "http://localhost") {
      return "/";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  // Query parameters from OAuth or Supabase confirmation links
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "email" | "recovery" | "invite" | "magiclink" | "sms" | null;
  const rawNext = searchParams.get("next");
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  // Determine origin handling proxies in production
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocalEnv = process.env.NODE_ENV === "development";
  const redirectOrigin = isLocalEnv || !forwardedHost ? origin : `${forwardedProto}://${forwardedHost}`;

  // Ensure redirect target is strictly internal
  const cleanNext = getSafeRedirectPath(rawNext);

  if (error) {
    console.error("❌ Auth Callback Error from provider:", { error, error_description });
    return NextResponse.redirect(
      `${redirectOrigin}/login?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(
        error_description || "Authentication failed."
      )}&showForm=true`
    );
  }

  // If no code or token_hash, redirect to login with a specific error
  if (!code && !token_hash) {
    console.warn("⚠️ Auth Callback: No code or token_hash received");
    return NextResponse.redirect(
      `${redirectOrigin}/login?error=auth_callback_missing_params&error_description=${encodeURIComponent(
        "No authentication parameters were received from the provider."
      )}&showForm=true`
    );
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient();

    if (code) {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError || !data?.session || !data?.user) {
        console.error("❌ Auth Callback: exchangeCodeForSession failed:", {
          message: exchangeError?.message,
          status: exchangeError?.status,
        });
        return NextResponse.redirect(
          `${redirectOrigin}/login?error=auth_exchange_failed&error_description=${encodeURIComponent(
            exchangeError?.message || "Failed to establish an authenticated session."
          )}&showForm=true`
        );
      }

      // Role verification: ensure only Administrators can access salon-dashboard
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.warn("⚠️ Auth Callback: Profile fetch warning:", profileError.message);
      }

      if (profile?.role && profile.role !== "Administrator") {
        console.warn("🛡️ Auth Callback: Access denied for non-admin user role:", profile.role);
        return NextResponse.redirect(`${redirectOrigin}/unauthorized`);
      }

      // Mark session as verified for the administrator proxy guard
      cookieStore.set("admin_otp_verified", data.user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });

      return NextResponse.redirect(`${redirectOrigin}${cleanNext}`);
    }

    if (token_hash && type) {
      const { data, error: otpError } = await supabase.auth.verifyOtp({ type, token_hash });

      if (otpError || !data?.session || !data?.user) {
        console.error("❌ Auth Callback: verifyOtp failed:", {
          message: otpError?.message,
          status: otpError?.status,
        });
        return NextResponse.redirect(
          `${redirectOrigin}/login?error=auth_otp_failed&error_description=${encodeURIComponent(
            otpError?.message || "Verification failed."
          )}&showForm=true`
        );
      }

      cookieStore.set("admin_otp_verified", data.user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });

      return NextResponse.redirect(`${redirectOrigin}${cleanNext}`);
    }

    console.warn("⚠️ Auth Callback: Invalid parameters combination");
    return NextResponse.redirect(
      `${redirectOrigin}/login?error=auth_callback_invalid&error_description=${encodeURIComponent(
        "The authentication flow responded with invalid parameters."
      )}&showForm=true`
    );
  } catch (err: any) {
    console.error("❌ Auth Callback: Unexpected exception:", err?.message || err);
    return NextResponse.redirect(
      `${redirectOrigin}/login?error=auth_callback_exception&error_description=${encodeURIComponent(
        err?.message || "Unexpected authentication error"
      )}&showForm=true`
    );
  }
}
