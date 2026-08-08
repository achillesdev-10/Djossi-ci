import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/password';
import { findUserByEmail, toPublic } from '@/lib/userRepository';
import {
  attachUserSessionCookie,
  issueUserSessionToken,
} from '@/lib/userSession';
import { getClientIp, isRateLimited } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Anti brute-force : 10 tentatives / 10 min par adresse IP.
    if (isRateLimited(`login:${getClientIp(request)}`)) {
      return NextResponse.json(
        { error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
        { status: 429 },
      );
    }

    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() || '';
    const password = body.password || '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Veuillez renseigner votre email et votre mot de passe.' },
        { status: 400 },
      );
    }

    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      // Message volontairement générique : on ne révèle pas si l'email existe.
      return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
    }

    const publicUser = toPublic(user);

    // Session réelle : jeton HMAC signé dans un cookie httpOnly (30 jours).
    const token = await issueUserSessionToken(publicUser);
    const response = NextResponse.json({ user: publicUser });
    return attachUserSessionCookie(response, token);
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    return NextResponse.json(
      { error: 'Impossible de se connecter pour le moment.' },
      { status: 500 },
    );
  }
}
