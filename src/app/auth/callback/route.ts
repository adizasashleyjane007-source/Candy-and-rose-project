import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin, hash } = request.nextUrl;
  
  // Try to get parameters from query string
  let code = searchParams.get("code");
  let token_hash = searchParams.get("token_hash");
  let type = searchParams.get("type") as any | null;
  const next = searchParams.get("next") ?? "/";
  let error = searchParams.get("error");
  let error_description = searchParams.get("error_description");

  // Fallback: Check fragment (hash) if query params are empty
  // Note: Fragment is not sent to the server in standard HTTP, but request.nextUrl might have it if Next.js parses it
  // Usually fragment handling for OAuth must happen on the CLIENT side.
  // HOWEVER, we can at least log what we have.

  console.log("Auth Callback Trace:", { 
    hasCode: !!code, 
    hasTokenHash: !!token_hash, 
    error: error || "none",
    origin,
    next,
    fullUrl: request.url 
  });

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${error}&error_description=${encodeURIComponent(error_description || "")}`);
  }

  // If no code/token_hash, redirect to login with a specific error
  if (!code && !token_hash) {
    console.warn("No code or token_hash found in callback URL");
    return NextResponse.redirect(`${origin}/login?error=auth_callback_missing_params&error_description=No+authentication+parameters+were+received+from+the+provider.`);
  }

  const supabase = await createClient();

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth_exchange_failed&error_description=${encodeURIComponent(exchangeError.message)}`);
  } 
  
  if (token_hash && type) {
    const { error: otpError } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!otpError) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth_otp_failed&error_description=${encodeURIComponent(otpError.message)}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_invalid&error_description=The+authentication+flow+responded+with+invalid+parameters.`);
}
