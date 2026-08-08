import { NextResponse } from 'next/server';
import { clearUserSessionCookie } from '@/lib/userSession';

export const runtime = 'nodejs';

/** POST /api/auth/logout — supprime le cookie de session. */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  return clearUserSessionCookie(response);
}
