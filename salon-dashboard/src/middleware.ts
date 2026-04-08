// Final Vercel Fix
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Use a temporary response object to handle cookies correctly
  let response = NextResponse.next({ request });

  // Initialize Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            // Updating the response object to make sure cookies propagate
            response = NextResponse.next({ request });
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get current user (this also refreshes session if needed)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 1. Defining Auth vs Non-Auth Routes
  const isAuthPage = pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isAuthCallback = pathname.startsWith("/auth/callback");

  // 2. Logic: Not Logged In
  if (!user) {
    // If user is trying to access anything that IS NOT an auth page or the callback
    if (!isAuthPage && !isAuthCallback) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      // Ensure we redirect but also pass any session clearing cookies if they were set
      return NextResponse.redirect(url);
    }
  }
  // 3. Logic: Already Logged In
  else {
    // If logged in, don't allow access to auth pages
    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // Return the processed response (with any refreshed cookies)
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, logos, etc (from public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
