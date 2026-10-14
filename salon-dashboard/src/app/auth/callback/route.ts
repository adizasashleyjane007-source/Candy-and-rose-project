import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { sendAdminOtp } from "@/lib/auth-otp";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  // Query parameters from OAuth or Supabase confirmation links
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "email" | "recovery" | "invite" | "magiclink" | "sms" | null;
  const rawNext = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const error_description = searchParams.get("error_description");

  // Determine origin handling proxies in production
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const isLocalEnv = process.env.NODE_ENV === "development";
  const redirectOrigin = isLocalEnv || !forwardedHost ? origin : `${forwardedProto}://${forwardedHost}`;

  // Ensure redirect target is internal
  const cleanNext = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  // Diagnostic trace before exchange (never logs tokens)
  console.log("Auth Callback Trace:", {
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    error: error || "none",
    origin: redirectOrigin,
    next: cleanNext,
  });

  if (error) {
    console.error("❌ Auth Callback Error from provider:", { error, error_description });
    return NextResponse.redirect(
      `${redirectOrigin}/login?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(error_description || "")}`
    );
  }

  // If no code or token_hash, redirect to login with a specific error
  if (!code && !token_hash) {
    console.warn("⚠️ Auth Callback: No code or token_hash received");
    return NextResponse.redirect(
      `${redirectOrigin}/login?error=auth_callback_missing_params&error_description=No+authentication+parameters+were+received+from+the+provider.`
    );
  }

  try {
    const cookieStore = await cookies();
    const cookiesToSet: { name: string; value: string; options?: any }[] = [];

    // Initialize Supabase Server Client with cookie tracking
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(incomingCookies) {
            incomingCookies.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Ignore in read-only phases if applicable
              }
            });
            cookiesToSet.push(...incomingCookies);
          },
        },
      }
    );

    if (code) {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError || !data?.user) {
        console.error("❌ Auth Callback: exchangeCodeForSession failed:", {
          message: exchangeError?.message,
          status: exchangeError?.status,
        });
        return NextResponse.redirect(
          `${redirectOrigin}/login?error=auth_exchange_failed&error_description=${encodeURIComponent(exchangeError?.message || "Exchange failed")}`
        );
      }

      const userEmail = data.user.email;
      const maskedEmail = userEmail
        ? `${userEmail.slice(0, 3)}***@${userEmail.split("@")[1] || ""}`
        : "unknown";

      console.log("✅ Auth Callback: Session established via exchangeCodeForSession", {
        userId: data.user.id,
        email: maskedEmail,
        cookiesCount: cookiesToSet.length,
      });

      // Role verification: ensure only Administrators can log into salon-dashboard
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, email, name")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.warn("⚠️ Auth Callback: Profile fetch warning:", profileError.message);
      }

      if (profile?.role !== "Administrator") {
        console.warn("🛡️ Auth Callback: Access denied for non-admin user role:", profile?.role);
        return NextResponse.redirect(
          `${redirectOrigin}/login?error=unauthorized_role&error_description=${encodeURIComponent("Access restricted to administrators only.")}`
        );
      }

      const adminEmail = profile?.email || userEmail;
      if (!adminEmail) {
        console.error("❌ Auth Callback: Admin email missing");
        return NextResponse.redirect(
          `${redirectOrigin}/login?error=email_missing&error_description=${encodeURIComponent("Admin email could not be determined.")}`
        );
      }

      // Step 3: Trigger Resend OTP generation & delivery immediately after Google OAuth
      const otpResult = await sendAdminOtp({
        userId: data.user.id,
        email: adminEmail,
        name: profile?.name || "Administrator",
        supabaseClient: supabase,
      });

      if (!otpResult.success) {
        console.error("❌ Auth Callback: Resend OTP delivery failed:", otpResult.error);
        return NextResponse.redirect(
          `${redirectOrigin}/login?error=otp_delivery_failed&error_description=${encodeURIComponent(otpResult.error || "Failed to send security code to your email.")}`
        );
      }

      // Step 4: Redirect to the OTP verification modal on /login with authenticated session cookies
      const redirectUrl = `${redirectOrigin}/login?verify_otp=true&email=${encodeURIComponent(adminEmail)}`;
      const response = NextResponse.redirect(redirectUrl);
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }

    if (token_hash && type) {
      const { data, error: otpError } = await supabase.auth.verifyOtp({ type, token_hash });

      if (otpError) {
        console.error("❌ Auth Callback: verifyOtp failed:", {
          message: otpError.message,
          status: otpError.status,
        });
        return NextResponse.redirect(
          `${redirectOrigin}/login?error=auth_otp_failed&error_description=${encodeURIComponent(otpError.message)}`
        );
      }

      console.log("✅ Auth Callback: Session established via verifyOtp", {
        userId: data?.user?.id,
        type,
        cookiesCount: cookiesToSet.length,
        redirectTo: cleanNext,
      });

      const response = NextResponse.redirect(`${redirectOrigin}${cleanNext}`);
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }

    console.warn("⚠️ Auth Callback: Invalid parameters combination");
    return NextResponse.redirect(
      `${redirectOrigin}/login?error=auth_callback_invalid&error_description=The+authentication+flow+responded+with+invalid+parameters.`
    );
  } catch (err: any) {
    console.error("❌ Auth Callback: Unexpected exception:", err?.message || err);
    return NextResponse.redirect(
      `${redirectOrigin}/login?error=auth_callback_exception&error_description=${encodeURIComponent(err?.message || "Unexpected authentication error")}`
    );
  }
}
