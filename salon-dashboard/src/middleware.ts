// Final Vercel Fix
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not use getSession() in middleware!
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Define routes
  const isAuthPage = pathname === "/login" || 
                    pathname === "/signup" || 
                    pathname === "/forgot-password" ||
                    pathname === "/reset-password";
  
  const isPublicRoute = isAuthPage || pathname.startsWith("/auth") || pathname === "/unauthorized";

  // 1. Unauthenticated users
  if (!user) {
    if (!isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // 2. Authenticated users
  
  // A. Redirect away from auth pages to root
  if (isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // B. Role-based check
  if (pathname !== "/unauthorized" && !pathname.startsWith("/auth")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdministrator = profile?.role === "Administrator";

    // Admin-only sub-pages check
    // If they aren't admin, kick them to /unauthorized for non-root pages
    // (Wait, the user wants themselves as admin to enter. I'll let everyone hit "/" if authenticated, 
    // but check for admin role for specific actions or sub-pages)
    if (!isAdministrator && pathname !== "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/unauthorized";
      return NextResponse.redirect(url);
    }

    // OTP verification check for admins
    if (isAdministrator) {
      const otpVerifiedCookie = request.cookies.get("admin_otp_verified")?.value;
      if (!otpVerifiedCookie || otpVerifiedCookie !== user.id) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("error", "verification_required");
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (the login page itself - VERY IMPORTANT)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};


