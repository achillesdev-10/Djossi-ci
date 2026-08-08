import { NextResponse } from 'next/server';
import { createMigratedUser } from '@/lib/userRepository';
import {
  attachUserSessionCookie,
  issueUserSessionToken,
} from '@/lib/userSession';
import { getClientIp, isRateLimited } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/auth/migrate-legacy
 *
 * Importe un ancien compte « simulé » (localStorage) dans la table users.
 * Ces comptes n'ont aucun mot de passe réel → mot de passe aléatoire
 * inutilisable + needs_password_reset=true.
 *
 * Sécurité :
 *  — si l'email existe déjà en base (vrai compte), on NE l'écrase PAS et on
 *    ne crée aucune session : le compte réel existant gagne toujours ;
 *  — rate-limité par IP comme l'inscription ;
 *  — le rôle est limité à candidate | company (jamais admin).
 */
export async function POST(request: Request) {
  try {
    if (isRateLimited(`migrate-legacy:${getClientIp(request)}`)) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429 },
      );
    }

    const body = (await request.json()) as {
      email?: string;
      name?: string;
      role?: string;
    };

    const email = body.email?.trim().toLowerCase() || '';
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Adresse email invalide pour la migration.' },
        { status: 400 },
      );
    }

    const role = body.role === 'company' ? 'company' : 'candidate';
    const name = (body.name?.trim() || email.split('@')[0]).slice(0, 120);

    const user = await createMigratedUser({ email, name, role });

    // L'email existe déjà (vrai compte) : on ne le touche pas. Réponse
    // volontairement identique quelle que soit la cause du refus — on ne
    // révèle pas si l'email correspond à un compte existant.
    if (!user) {
      return NextResponse.json({ migrated: false });
    }

    // Compte migré : session immédiate (auto-connecté).
    const token = await issueUserSessionToken(user);
    const response = NextResponse.json({
      migrated: true,
      user,
    });
    return attachUserSessionCookie(response, token);
  } catch (err) {
    console.error('POST /api/auth/migrate-legacy error:', err);
    return NextResponse.json(
      { error: 'Impossible de migrer le compte pour le moment.' },
      { status: 500 },
    );
  }
}
