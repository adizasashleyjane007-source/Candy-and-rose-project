  // Final Vercel Fix
  import { createServerClient } from "@supabase/ssr";
  import { NextResponse, type NextRequest } from "next/server";

  export async function proxy(request: NextRequest) {
    // 1. Initial response and Login exception (to prevent loops)
    let response = NextResponse.next({
      request,
    });

    const { pathname } = request.nextUrl;
    
    // If the user is on the login page or other auth-related pages, API routes, or static files, let them proceed without checking auth here
    // This prevents redirect loops and API route HTML redirects.
    if (
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/api") ||
      /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$/i.test(pathname)
    ) {
      return response;
    }

    // 2. Initialize Supabase client
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

    // 3. SECURE AUTH CHECK: Using getUser() as requested
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Helper to preserve cookies across redirects
    const createRedirect = (url: URL | string) => {
      const redirectResponse = NextResponse.redirect(url);
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    };

    const cookieNames = request.cookies.getAll().map((c) => c.name);

    // Safe diagnostic log of incoming state
    console.log("🛡️ [Proxy] Intercepted request:", {
      pathname,
      cookieNames,
      hasUser: !!user,
      userId: user?.id ?? null,
      authError: authError ? authError.message : null,
    });

    // 4. REDIRECT LOGIC
    
    // If NOT logged in: Protect root "/" and all admin sub-pages
    if (!user) {
      // Explicitly protect root "/" and any other non-public pages
      if (pathname === "/" || !pathname.includes(".")) {
        console.log("🛡️ [Proxy] Decision: Redirecting unauthenticated request to /login from:", pathname);
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return createRedirect(url);
      }
    } else {
      // If logged in: Handle role-based access if necessary
      // (Existing logic for profiles and Administrator role preserved)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isAdministrator = profile?.role === "Administrator";

      if (profileError) {
        console.warn("🛡️ [Proxy] Profile fetch warning:", profileError.message);
      }

      if (!isAdministrator && pathname !== "/" && pathname !== "/unauthorized") {
        console.log("🛡️ [Proxy] Decision: Non-admin redirected to /unauthorized from:", pathname, { role: profile?.role });
        const url = request.nextUrl.clone();
        url.pathname = "/unauthorized";
        return createRedirect(url);
      }

      // OTP verification check for admins
      if (isAdministrator) {
        const otpVerifiedCookie = request.cookies.get("admin_otp_verified")?.value;
        const isOtpVerified = !!otpVerifiedCookie && otpVerifiedCookie === user.id;

        console.log("🛡️ [Proxy] Admin 2FA check:", {
          hasOtpCookie: !!otpVerifiedCookie,
          isOtpVerified,
          pathname,
        });

        if (!isOtpVerified) {
          if (pathname !== "/login") {
            console.log("🛡️ [Proxy] Decision: Admin OTP required. Redirecting to /login?error=verification_required from:", pathname);
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("error", "verification_required");
            return createRedirect(url);
          }
        }
      }
    }

    console.log("🛡️ [Proxy] Decision: Access granted for:", pathname);
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
      * - Static files with extensions
      */
      "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
  };



