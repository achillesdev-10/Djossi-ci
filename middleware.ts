import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/adminSession';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Ne traiter que les routes commençant par /admin
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Si l'utilisateur demande la page de login (/admin/login)
  if (pathname.startsWith('/admin/login')) {
    const session = await getAdminSessionFromRequest(request);
    // S'il est déjà connecté, on le redirige vers le dashboard (/admin)
    if (session) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    // Sinon, on laisse passer pour afficher le formulaire de connexion
    return NextResponse.next();
  }

  // Pour toutes les autres routes /admin/* (dashboard, jobs, scraper, settings), vérifier la session
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Exclure explicitement les fichiers statiques, les favicons et les assets internes Next.js
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
