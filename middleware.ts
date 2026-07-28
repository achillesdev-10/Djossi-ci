import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/adminSession';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAdminToken = request.cookies.has(ADMIN_SESSION_COOKIE);

  // 1. Ne JAMAIS intercepter la page de login
  if (pathname === '/admin/login') {
    if (hasAdminToken) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // 2. Protéger les autres routes /admin
  if (pathname.startsWith('/admin') && !hasAdminToken) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
