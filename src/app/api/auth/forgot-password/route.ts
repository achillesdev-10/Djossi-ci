import { NextResponse } from 'next/server';
import { isEmailConfigured, sendPasswordResetEmail, getSiteUrl } from '@/lib/email';
import {
  createResetToken,
  deleteUserResetTokens,
  findUserByEmail,
} from '@/lib/userRepository';
import { getClientIp, isRateLimited } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  try {
    // Anti-spam : 10 demandes / 10 min par adresse IP (évite l'inondation email).
    if (isRateLimited(`forgot:${getClientIp(request)}`)) {
      return NextResponse.json(
        { error: 'Trop de demandes. Réessayez dans quelques minutes.' },
        { status: 429 },
      );
    }

    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() || '';

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Veuillez saisir une adresse email valide.' },
        { status: 400 },
      );
    }

    // Sécurité : si le service d'email n'est pas configuré, on ne traite aucune
    // demande (on ne révèle pas non plus si le compte existe).
    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error:
            'Le service d’envoi d’emails n’est pas encore configuré sur le serveur. Contactez l’administrateur.',
        },
        { status: 503 },
      );
    }

    const user = await findUserByEmail(email);

    // Réponse toujours identique (succès ou compte inconnu) : pas de fuite
    // d'information sur l'existence d'un compte.
    if (user) {
      const token = await createResetToken(user.id);
      const resetUrl = `${getSiteUrl()}/reset-password?token=${token}`;
      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (err) {
        console.error('sendPasswordResetEmail error:', err);
        // Échec d'envoi → jeton supprimé (pas de lien mort) + erreur explicite.
        await deleteUserResetTokens(user.id).catch(() => undefined);
        return NextResponse.json(
          { error: 'Impossible d’envoyer l’email de réinitialisation. Veuillez réessayer.' },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message:
        'Si un compte existe pour cette adresse, un email de réinitialisation vient de lui être envoyé.',
    });
  } catch (err) {
    console.error('POST /api/auth/forgot-password error:', err);
    return NextResponse.json(
      { error: 'Impossible de traiter la demande pour le moment.' },
      { status: 500 },
    );
  }
}
