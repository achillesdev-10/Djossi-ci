/**
 *  TravaillerenCi — sessionToken.ts
 *
 *  Module PUR de création / vérification des jetons de session admin.
 *  Contrainte importante : NE PAS importer `next/headers` (ni toute autre
 *  dépendance Next.js) ici — ce module est utilisé à la fois côté Node
 *  (route handlers, server components) et côté Edge (middleware).
 *  Il ne repose que sur les primitives WebCrypto disponibles dans les
 *  deux environnements : crypto.subtle, TextEncoder, atob, btoa.
 */

export const ADMIN_SESSION_COOKIE = 'travaillerenci_admin_session';
export const LEGACY_ADMIN_SESSION_COOKIE = 'travaillerenci_admin_session';
export const SESSION_DURATION_HOURS = Number(
  process.env.ADMIN_SESSION_TTL_HOURS || 12
);

export interface AdminSession {
  email: string;
  role: 'admin';
  iat: number;
  exp: number;
}

export function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.JWT_SECRET ||
    'travaillerenci-admin-dev-secret'
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function encodeBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function decodeBase64Url(value: string): string {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function signValue(value: string): Promise<string> {
  const secret = new TextEncoder().encode(getSessionSecret());
  const key = await crypto.subtle.importKey(
    'raw',
    secret as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value) as unknown as BufferSource
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verifySignature(value: string, signature: string): Promise<boolean> {
  const secret = new TextEncoder().encode(getSessionSecret());
  const key = await crypto.subtle.importKey(
    'raw',
    secret as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const sigBytes = base64UrlToBytes(signature);
  const dataBytes = new TextEncoder().encode(value);

  return crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes as unknown as BufferSource,
    dataBytes as unknown as BufferSource
  );
}

export async function createAdminSessionToken(email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSession = {
    email,
    role: 'admin',
    iat: now,
    exp: now + SESSION_DURATION_HOURS * 60 * 60,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = await signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifyAdminSessionToken(
  token?: string | null
): Promise<AdminSession | null> {
  if (!token) return null;

  // Tout jeton malformé (base64url invalide, mauvaise structure, JSON cassé,
  // signature invalide, expiré) doit retourner null et JAMAIS lever — sinon
  // un cookie corrompu ferait planter getAdminSession() côté serveur (500).
  try {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const isValid = await verifySignature(payload, signature);
    if (!isValid) return null;

    const parsed = JSON.parse(decodeBase64Url(payload)) as AdminSession;
    if (parsed.role !== 'admin' || parsed.exp * 1000 <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
