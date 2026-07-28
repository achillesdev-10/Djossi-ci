import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/adminSession';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Autoriser explicitement la page de login pour éviter les boucles de redirection
  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next();
  }

  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
