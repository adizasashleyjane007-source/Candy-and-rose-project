  // Final Vercel Fix
  import { createServerClient } from "@supabase/ssr";
  import { NextResponse, type NextRequest } from "next/server";

  export async function middleware(request: NextRequest) {
    // 1. Initial response and Login exception (to prevent loops)
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const { pathname } = request.nextUrl;
    
    // If the user is on the login page or other auth-related pages, let them proceed without checking auth here
    // This prevents redirect loops.
    if (pathname === "/login" || pathname === "/signup" || pathname.startsWith("/auth")) {
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
    const { data: { user } } = await supabase.auth.getUser();

    // 4. REDIRECT LOGIC
    
    // If NOT logged in: Protect root "/" and all admin sub-pages
    if (!user) {
      // Explicitly protect root "/" and any other non-public pages
      if (pathname === "/" || !pathname.includes(".")) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    } else {
      // If logged in: Handle role-based access if necessary
      // (Existing logic for profiles and Administrator role preserved)
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isAdministrator = profile?.role === "Administrator";

      if (!isAdministrator && pathname !== "/" && pathname !== "/unauthorized") {
        const url = request.nextUrl.clone();
        url.pathname = "/unauthorized";
        return NextResponse.redirect(url);
      }

      // OTP verification check for admins
      if (isAdministrator) {
        const otpVerifiedCookie = request.cookies.get("admin_otp_verified")?.value;
        if (!otpVerifiedCookie || otpVerifiedCookie !== user.id) {
          if (pathname !== "/login") {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("error", "verification_required");
            return NextResponse.redirect(url);
          }
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
      */
      "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
  };



