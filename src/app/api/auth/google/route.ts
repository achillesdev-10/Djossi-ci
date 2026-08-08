import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  buildAuthorizationUrl,
  generateCodeChallenge,
  generateOAuthState,
  generatePkceVerifier,
  getGoogleRedirectUri,
  isGoogleAuthConfigured,
  safeNextPath,
} from '@/lib/googleOAuth';

export const runtime = 'nodejs';

const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 600, // 10 minutes
};

/**
 * GET /api/auth/google?role=candidate|company&next=/dashboard/candidate
 *
 * Démarre le flux OAuth Google : génère le state (anti-CSRF) et le
 * code_verifier PKCE, les stocke en cookies httpOnly, puis redirige vers le
 * consentement Google.
 */
export async function GET(request: NextRequest) {
  if (!isGoogleAuthConfigured()) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'google_not_configured');
    return NextResponse.redirect(loginUrl);
  }

  const role = request.nextUrl.searchParams.get('role') === 'company' ? 'company' : 'candidate';
  const next = safeNextPath(
    request.nextUrl.searchParams.get('next'),
    role === 'company' ? '/dashboard/company' : '/dashboard/candidate',
  );

  const state = generateOAuthState();
  const codeVerifier = generatePkceVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const redirectUri = getGoogleRedirectUri();
  const authUrl = buildAuthorizationUrl({ state, codeChallenge, redirectUri });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('google_oauth_state', state, OAUTH_COOKIE_OPTIONS);
  response.cookies.set('google_oauth_verifier', codeVerifier, OAUTH_COOKIE_OPTIONS);
  // Intention (rôle + destination) — lue au retour du callback.
  response.cookies.set('google_oauth_intent', JSON.stringify({ role, next }), OAUTH_COOKIE_OPTIONS);
  return response;
}
