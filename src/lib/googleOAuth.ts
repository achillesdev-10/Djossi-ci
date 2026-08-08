import 'server-only';
import { randomBytes } from 'node:crypto';
import { getSiteUrl } from '@/lib/email';

/**
 *  TravaillerEnCi — src/lib/googleOAuth.ts
 *  Connexion Google (OAuth 2.0 Authorization Code + PKCE), sans SDK.
 *
 *  Configuration (variables d'environnement) :
 *    GOOGLE_CLIENT_ID     — OAuth Client ID (Google Cloud Console)
 *    GOOGLE_CLIENT_SECRET — OAuth Client Secret (application Web)
 *
 *  L'URI de redirection est dérivée de NEXT_PUBLIC_SITE_URL (ou localhost en
 *  dev) : `${getSiteUrl()}/api/auth/google/callback` — elle doit être
 *  enregistrée telle quelle dans la Google Cloud Console.
 *
 *  Sécurité :
 *    • PKCE (S256) : le code d'autorisation ne peut pas être rejoué sans le
 *      code_verifier conservé côté serveur.
 *    • State : jeton aléatoire comparé au cookie pour bloquer le CSRF.
 *    • id_token : signature RS256 vérifiée contre le JWKS de Google + contrôle
 *      de `iss`, `aud` et `exp` — on ne fait jamais confiance au client.
 */

const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
const JWKS_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/certs';
const SCOPES = 'openid email profile';

export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleRedirectUri(): string {
  return `${getSiteUrl()}/api/auth/google/callback`;
}

// -----------------------------------------------------------------------------
// Utilitaires base64url + PKCE
// -----------------------------------------------------------------------------

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Génère un code_verifier PKCE (43-128 caractères, chars non réservés). */
export function generatePkceVerifier(): string {
  return randomBytes(32).toString('base64url');
}

/** Calcule le code_challenge S256 à partir du code_verifier. */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return bytesToBase64Url(new Uint8Array(digest));
}

/** Jeton d'état aléatoire (anti-CSRF). */
export function generateOAuthState(): string {
  return randomBytes(16).toString('hex');
}

// -----------------------------------------------------------------------------
// Étape 1 : URL d'autorisation
// -----------------------------------------------------------------------------

export function buildAuthorizationUrl(params: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
  prompt?: 'select_account' | 'consent';
}): string {
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', params.prompt ?? 'select_account');
  return url.toString();
}

// -----------------------------------------------------------------------------
// Étape 2 : échange du code contre les jetons
// -----------------------------------------------------------------------------

export interface GoogleTokenResponse {
  access_token: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/** Échange le code d'autorisation contre access_token + id_token. */
export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: params.codeVerifier,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Échange de code Google refusé (${res.status}) : ${text.slice(0, 300)}`);
  }

  return (await res.json()) as GoogleTokenResponse;
}

// -----------------------------------------------------------------------------
// Étape 3 : vérification de l'id_token (JWKS RS256)
// -----------------------------------------------------------------------------

interface GoogleJwk {
  kid: string;
  n: string;
  e: string;
  alg: string;
}

let cachedJwks: { keys: GoogleJwk[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 h

async function getJwks(): Promise<GoogleJwk[]> {
  if (cachedJwks && Date.now() - cachedJwks.fetchedAt < JWKS_TTL_MS) {
    return cachedJwks.keys;
  }
  const res = await fetch(JWKS_ENDPOINT, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Impossible de charger le JWKS Google (${res.status}).`);
  }
  const data = (await res.json()) as { keys: GoogleJwk[] };
  cachedJwks = { keys: data.keys, fetchedAt: Date.now() };
  return data.keys;
}

/** Claims de l'id_token validés (jamais de signature vérifiée ici). */
export interface VerifiedGoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string | null;
  picture: string | null;
}

function decodeJwtSegment(segment: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment))) as Record<string, unknown>;
}

/**
 * Vérifie la signature RS256 d'un id_token Google (JWKS) + les claims iss/aud/exp.
 * Retourne le profil, ou null si le jeton est invalide.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleProfile | null> {
  try {
    const segments = idToken.split('.');
    if (segments.length !== 3) return null;

    const [headerSegment, payloadSegment, signatureSegment] = segments;
    const header = decodeJwtSegment(headerSegment);
    const payload = decodeJwtSegment(payloadSegment);

    // Claims obligatoires.
    const iss = String(payload.iss ?? '');
    if (iss !== 'https://accounts.google.com' && iss !== 'accounts.google.com') return null;
    if (String(payload.aud ?? '') !== process.env.GOOGLE_CLIENT_ID) return null;
    const exp = Number(payload.exp ?? 0);
    if (!exp || exp * 1000 <= Date.now()) return null;
    if (String(header.alg) !== 'RS256') return null;

    // Signature : trouver la clé par kid.
    const kid = String(header.kid ?? '');
    const keys = await getJwks();
    const jwk = keys.find((k) => k.kid === kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const data = new TextEncoder().encode(`${headerSegment}.${payloadSegment}`);
    const signature = base64UrlToBytes(signatureSegment);
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      signature as unknown as BufferSource,
      data,
    );
    if (!valid) return null;

    const sub = String(payload.sub ?? '');
    const email = String(payload.email ?? '').trim().toLowerCase();
    if (!sub || !email) return null;

    return {
      sub,
      email,
      email_verified: payload.email_verified === true,
      name: typeof payload.name === 'string' ? payload.name : null,
      picture: typeof payload.picture === 'string' ? payload.picture : null,
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Repli : userinfo endpoint (si id_token absent)
// -----------------------------------------------------------------------------

export async function fetchGoogleUserInfo(accessToken: string): Promise<VerifiedGoogleProfile | null> {
  try {
    const res = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    const sub = String(data.sub ?? '');
    const email = String(data.email ?? '').trim().toLowerCase();
    if (!sub || !email) return null;
    return {
      sub,
      email,
      email_verified: data.email_verified === true,
      name: data.name ?? null,
      picture: data.picture ?? null,
    };
  } catch {
    return null;
  }
}

/** Valide une valeur `next` (protection anti open-redirect). */
export function safeNextPath(raw: string | null, fallback: string): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')) {
    return raw;
  }
  return fallback;
}
