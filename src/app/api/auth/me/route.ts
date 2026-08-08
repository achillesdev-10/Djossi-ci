import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/userSession';

export const runtime = 'nodejs';

/**
 * GET /api/auth/me — retourne l'utilisateur connecté (ré-hydraté depuis la
 * base) ou `{ user: null }` si la session est absente / invalide / expirée.
 */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}
