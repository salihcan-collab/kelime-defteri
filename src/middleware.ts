import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

/**
 * Gatekeeper for the whole app: every route needs a valid session cookie
 * except the login/signup pages and their supporting API routes. Runs in
 * the Edge runtime, so auth.ts uses `jose` (not `jsonwebtoken`) for
 * verification — it's the one part of auth.ts that has to be Edge-safe.
 */

const PUBLIC_PATHS = ['/login', '/signup'];
const PUBLIC_API_PREFIXES = ['/api/auth/'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized — please log in.' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static files.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
