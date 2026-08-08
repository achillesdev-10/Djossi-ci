import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/password';
import { getSessionUser } from '@/lib/userSession';
import { findUserByEmail, updateUserPassword } from '@/lib/userRepository';
import { getClientIp, isRateLimited } from '@/lib/rateLimit';

export const runtime = 'nodejs';

/**
 * POST /api/auth/set-password  { password }
 *
 * Permet à un utilisateur CONNECTÉ de définir son mot de passe. Utile pour
 * les comptes migrés depuis l'ancien localStorage (needs_password_reset) et
 * les comptes créés via Google : ces comptes n'ont pas de mot de passe réel.
 *
 * Sécurité : session obligatoire (cookie httpOnly vérifié) + rate limit.
 */
export async function POST(request: Request) {
  try {
    if (isRateLimited(`set-password:${getClientIp(request)}`)) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429 },
      );
    }

    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { error: 'Session invalide ou expirée. Reconnectez-vous.' },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { password?: string };
    const password = body.password || '';
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
        { status: 400 },
      );
    }

    const user = await findUserByEmail(session.email);
    if (!user) {
      return NextResponse.json(
        { error: 'Compte introuvable.' },
        { status: 404 },
      );
    }

    await updateUserPassword(user.id, hashPassword(password));

    return NextResponse.json({
      ok: true,
      message: 'Votre mot de passe a été défini avec succès.',
    });
  } catch (err) {
    console.error('POST /api/auth/set-password error:', err);
    return NextResponse.json(
      { error: 'Impossible de définir le mot de passe pour le moment.' },
      { status: 500 },
    );
  }
}
