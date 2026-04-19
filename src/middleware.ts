// Final Vercel Fix
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isUnauthorizedPage = pathname.startsWith("/unauthorized");

  // If hitting the callback, just return the response and let the Route Handler take over
  if (isAuthCallback) {
    return response;
  }

  // Handle Authentication and Authorization
  if (!user) {
    // Not Logged In
    if (pathname !== "/" && !isAuthPage && !isUnauthorizedPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  } else {
    // Already Logged In
    
    // Check role for protected pages
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdministrator = profile?.role === "Administrator";

    // SECONDARY OTP CHECK FOR ADMINISTRATORS
    if (isAdministrator) {
      const otpVerifiedCookie = request.cookies.get("admin_otp_verified")?.value;
      
      // If Admin is logged in but has no valid OTP verification cookie
      if (!otpVerifiedCookie || otpVerifiedCookie !== user.id) {
        // If they are trying to access dashboard (not login page), kick them back to login
        if (!isAuthPage && pathname !== "/unauthorized") {
          const url = request.nextUrl.clone();
          url.pathname = "/login";
          url.searchParams.set("error", "verification_required");
          return NextResponse.redirect(url);
        }
        
        // If they are ALREADY on the login page but authenticated, 
        // DO NOT redirect them away to dashboard yet. 
        // This stops the auto-redirect bypass.
        if (isAuthPage) {
          return response;
        }
      }
    }

    // Role check: Only Admins can access non-auth pages (except home/root sometimes)
    if (!isAuthPage && !isUnauthorizedPage && pathname !== "/" && !isAdministrator) {
      const url = request.nextUrl.clone();
      url.pathname = "/unauthorized";
      return NextResponse.redirect(url);
    }

    // Redirect away from auth pages if logged in (for non-admins or fully verified admins)
    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (Supabase auth callback)
     * - api (API routes)
     * - images, logos, etc (from public folder)
     */
    "/((?!api|_next/static|_next/image|auth|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
