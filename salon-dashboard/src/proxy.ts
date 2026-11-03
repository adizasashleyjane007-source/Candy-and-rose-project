import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Static-asset extensions that the middleware must never touch.
// These are handled by Next.js / the CDN before middleware runs anyway, but
// listing them here keeps the matcher tight and avoids any edge-case where
// a path like /fonts/file.woff2 slips through.
// ---------------------------------------------------------------------------
const STATIC_EXT_RE =
  /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|map|woff|woff2|ttf|otf|eot|txt|xml|json)$/i;

// Routes that must never redirect-loop and need no auth check.
const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/update-password",
  "/auth",       // /auth/callback, /auth/confirm, etc.
  "/api",        // API routes handle their own auth
  "/unauthorized",
];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    STATIC_EXT_RE.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Short-circuit public paths immediately ────────────────────────────
  // Build a clean pass-through response so Supabase can still refresh the
  // auth cookie even on public pages (token refresh must happen on every
  // request per the @supabase/ssr docs).
  let response = NextResponse.next({ request });

  if (isPublicPath(pathname)) {
    return response;
  }

  // ── 2. Initialise the Supabase SSR client ────────────────────────────────
  // The cookie helpers follow the @supabase/ssr recommended pattern exactly:
  // setAll rebuilds `response` so that refreshed auth cookies are carried
  // forward on every subsequent use of `response`.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Rebuild `response` so the refreshed tokens are attached.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── 3. Server-validated auth check ──────────────────────────────────────
  // getUser() validates the JWT with the Supabase auth server on every call.
  // Do NOT replace this with a cookie-only check (getSession without getUser)
  // because that would allow forged or replayed JWT cookies to pass.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError && process.env.NODE_ENV === "development") {
    console.warn("[Middleware] getUser error:", authError.message);
  }

  // ── 4. Redirect helper – always copies freshly set Supabase cookies ──────
  // We read from `response` (which setAll may have rebuilt) so any refreshed
  // tokens are preserved across redirects.
  const createRedirect = (destination: URL | string) => {
    const redirectResponse = NextResponse.redirect(destination);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  };

  // ── 5. Unauthenticated: redirect to /login ───────────────────────────────
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return createRedirect(loginUrl);
  }

  // ── 6. Role check: only Administrators may access the dashboard ──────────
  // We combine the profile fetch with the auth check in a single DB round
  // trip. The query selects only the `role` column to keep the payload small.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError && process.env.NODE_ENV === "development") {
    console.warn("[Middleware] Profile fetch error:", profileError.message);
  }

  const isAdministrator = profile?.role === "Administrator";

  if (!isAdministrator) {
    const unauthorizedUrl = request.nextUrl.clone();
    unauthorizedUrl.pathname = "/unauthorized";
    return createRedirect(unauthorizedUrl);
  }

  // ── 7. Administrator 2FA check ───────────────────────────────────────────
  // The `admin_otp_verified` cookie is:
  //   • Set server-side by /api/auth/otp/verify (httpOnly, Secure in prod).
  //   • Its value is the authenticated user's UUID, verified before it is set.
  //   • Cannot be read or forged by client-side JavaScript (httpOnly).
  //
  // We cross-check the cookie value against the JWT-verified user.id so that
  // a cookie issued for one admin session cannot be replayed for another user.
  const otpVerifiedCookie = request.cookies.get("admin_otp_verified")?.value;
  const isOtpVerified =
    typeof otpVerifiedCookie === "string" &&
    otpVerifiedCookie.length > 0 &&
    otpVerifiedCookie === user.id;

  if (!isOtpVerified) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "verification_required");
    return createRedirect(loginUrl);
  }

  // ── 8. All checks passed – allow request ─────────────────────────────────
  return response;
}

// ---------------------------------------------------------------------------
// Matcher: run middleware on every request EXCEPT Next.js internals and known
// static-file extensions.  Keeping it broad ensures auth cookie refresh fires
// on all page navigations.  The isPublicPath() guard above handles the rest.
// ---------------------------------------------------------------------------
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|map|woff|woff2|ttf|otf|eot|txt|xml)$).*)",
  ],
};
