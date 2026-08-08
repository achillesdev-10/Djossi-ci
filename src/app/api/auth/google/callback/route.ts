import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  getGoogleRedirectUri,
  safeNextPath,
  verifyGoogleIdToken,
} from '@/lib/googleOAuth';
import { upsertGoogleUser } from '@/lib/userRepository';
import {
  attachUserSessionCookie,
  issueUserSessionToken,
} from '@/lib/userSession';
import { getClientIp, isRateLimited } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

function clearOAuthCookies(response: NextResponse): NextResponse {
  for (const name of ['google_oauth_state', 'google_oauth_verifier', 'google_oauth_intent']) {
    response.cookies.set(name, '', { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });
  }
  return response;
}

function redirectToLogin(request: NextRequest, error: string): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('error', error);
  const response = NextResponse.redirect(loginUrl);
  return clearOAuthCookies(response);
}

/**
 * GET /api/auth/google/callback?code=...&state=...
 *
 * 1. Vérifie le `state` (anti-CSRF) contre le cookie posé à l'initiation.
 * 2. Échange le code contre access_token + id_token (PKCE).
 * 3. Vérifie la signature de l'id_token (JWKS RS256) + claims iss/aud/exp.
 * 4. Crée ou lie le compte utilisateur (google_sub).
 * 5. Pose le cookie de session httpOnly puis redirige vers le dashboard.
 */
export async function GET(request: NextRequest) {
  // Anti brute-force : échanges de code limités par IP.
  if (isRateLimited(`google-callback:${getClientIp(request)}`)) {
    return redirectToLogin(request, 'rate_limited');
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const expectedState = request.cookies.get('google_oauth_state')?.value;
  const codeVerifier = request.cookies.get('google_oauth_verifier')?.value;

  // Refus / annulation par l'utilisateur.
  if (errorParam) {
    return redirectToLogin(request, 'oauth_denied');
  }
  if (!code || !expectedState || !state || state !== expectedState) {
    // État invalide ou absent → possible attaque CSRF ou lien périmé.
    return redirectToLogin(request, 'oauth_invalid_state');
  }
  if (!codeVerifier) {
    return redirectToLogin(request, 'oauth_invalid_state');
  }

  // Intention (rôle + destination) stockée à l'initiation.
  let role: 'candidate' | 'company' = 'candidate';
  let next = '/dashboard/candidate';
  try {
    const rawIntent = request.cookies.get('google_oauth_intent')?.value;
    if (rawIntent) {
      const parsed = JSON.parse(rawIntent) as { role?: string; next?: string };
      role = parsed.role === 'company' ? 'company' : 'candidate';
      next = safeNextPath(parsed.next ?? null, role === 'company' ? '/dashboard/company' : '/dashboard/candidate');
    }
  } catch {
    // intention illisible → défauts
  }

  try {
    const redirectUri = getGoogleRedirectUri();

    // 1. Échange du code (PKCE) contre les jetons.
    const tokens = await exchangeCodeForTokens({ code, codeVerifier, redirectUri });

    // 2. Vérification de l'id_token (signature + claims) quand disponible ;
    //    sinon repli sur l'endpoint userinfo avec l'access_token.
    const profile = tokens.id_token
      ? await verifyGoogleIdToken(tokens.id_token)
      : await fetchGoogleUserInfo(tokens.access_token);

    if (!profile) {
      return redirectToLogin(request, 'oauth_invalid_token');
    }

    // 3. Création ou liaison du compte (google_sub unique).
    const user = await upsertGoogleUser({
      googleSub: profile.sub,
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      role,
      emailVerified: profile.email_verified,
    });
    if (!user) {
      return redirectToLogin(request, 'oauth_user_creation');
    }

    // 4. Session httpOnly puis redirection : si l'intention pointe vers un
    //    dashboard dont le rôle ne correspond pas au rôle réel du compte
    //    (source de vérité = base), on corrige la destination. Les autres
    //    destinations (ex. /jobs depuis /login?next=...) sont conservées.
    const expectedDashboard =
      user.role === 'company' ? '/dashboard/company' : '/dashboard/candidate';
    if (next.startsWith('/dashboard/') && next !== expectedDashboard) {
      next = expectedDashboard;
    }
    const token = await issueUserSessionToken(user);
    const response = NextResponse.redirect(new URL(next, request.url));
    clearOAuthCookies(response);
    return attachUserSessionCookie(response, token);
  } catch (err) {
    console.error('GET /api/auth/google/callback error:', err);
    return redirectToLogin(request, 'oauth_error');
  }
}
