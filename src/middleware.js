import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];
const PROTECTED_PREFIXES = ['/projects', '/dashboard', '/settings'];

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('tg_token')?.value;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  // Skip static files and API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // If not logged in and visiting a protected page -> /login
  if (!token && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // If logged in and visiting login/register -> /projects
  if (token && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/projects';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Apply middleware only where we need it
export const config = {
  matcher: ['/((?!_next|assets|api|favicon.ico).*)'],
};
