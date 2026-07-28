import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  isAdminCredentialsConfigured,
  validateAdminCredentials,
} from '@/lib/adminSession';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase() || '';
    const password = body.password?.trim() || '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Veuillez renseigner votre email et votre mot de passe.' },
        { status: 400 }
      );
    }

    if (!isAdminCredentialsConfigured() && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Les identifiants admin ne sont pas configurés sur le serveur.' },
        { status: 503 }
      );
    }

    const isValid = await validateAdminCredentials(email, password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Identifiants administrateur invalides.' },
        { status: 401 }
      );
    }

    const token = await createAdminSessionToken(email);
    const response = NextResponse.json({
      ok: true,
      user: { email, role: 'admin' as const },
    });

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * Number(process.env.ADMIN_SESSION_TTL_HOURS || 12),
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Impossible de démarrer la session administrateur.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
