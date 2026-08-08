import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/password';
import {
  deleteUserResetTokens,
  findUserByResetToken,
  updateUserPassword,
} from '@/lib/userRepository';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; password?: string };
    const token = body.token?.trim() || '';
    const password = body.password || '';

    if (!token) {
      return NextResponse.json(
        { error: 'Lien de réinitialisation invalide ou manquant.' },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
        { status: 400 },
      );
    }

    const user = await findUserByResetToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Ce lien de réinitialisation est invalide ou a expiré.' },
        { status: 400 },
      );
    }

    await updateUserPassword(user.id, hashPassword(password));
    await deleteUserResetTokens(user.id);

    return NextResponse.json({
      ok: true,
      message: 'Votre mot de passe a bien été réinitialisé. Vous pouvez vous connecter.',
    });
  } catch (err) {
    console.error('POST /api/auth/reset-password error:', err);
    return NextResponse.json(
      { error: 'Impossible de réinitialiser le mot de passe pour le moment.' },
      { status: 500 },
    );
  }
}
