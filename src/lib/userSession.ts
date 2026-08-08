import 'server-only';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import {
  USER_SESSION_COOKIE,
  USER_SESSION_TTL_SECONDS,
  createUserSessionToken,
  verifyUserSessionToken,
  type UserSession,
} from '@/lib/sessionToken';
import { findUserByEmail, toPublic, type PublicUser } from '@/lib/userRepository';

export const USER_SESSION_COOKIE_NAME = USER_SESSION_COOKIE;

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

/** Crée le jeton de session pour un utilisateur public. */
export async function issueUserSessionToken(user: PublicUser): Promise<string> {
  return createUserSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

/** Pose le cookie de session httpOnly sur une réponse. */
export function attachUserSessionCookie(
  response: NextResponse,
  token: string,
): NextResponse {
  response.cookies.set(USER_SESSION_COOKIE, token, {
    ...COOKIE_OPTIONS,
    maxAge: USER_SESSION_TTL_SECONDS,
  });
  return response;
}

/** Supprime le cookie de session (déconnexion). */
export function clearUserSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(USER_SESSION_COOKIE, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}

/** Lit la session depuis le cookie (retourne null si absent / invalide / expirée). */
export async function getSessionUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyUserSessionToken(token);
}

/**
 * Retourne l'utilisateur public connecté (ré-hydraté depuis la base, pour
 * toujours refléter les données à jour), ou null si non connecté.
 */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const user = await findUserByEmail(session.email);
  if (!user) return null;
  return toPublic(user);
}
