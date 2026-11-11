import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CACHE_BUST_VERSION = 'hairstyle-upload-v8';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (process.env.NODE_ENV !== 'production') {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    // Clear stale immutable static chunk cache once per version on document requests
    const accept = request.headers.get('accept') || '';
    const isDocument = accept.includes('text/html') || request.headers.get('sec-fetch-dest') === 'document';
    const currentCookie = request.cookies.get('__salon_cache_cleared')?.value;

    if (isDocument && currentCookie !== CACHE_BUST_VERSION) {
      response.headers.set('Clear-Site-Data', '"cache"');
      response.cookies.set('__salon_cache_cleared', CACHE_BUST_VERSION, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/image|favicon.ico).*)'],
};

