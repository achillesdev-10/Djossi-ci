import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'travaillerenci_admin_session';
const LEGACY_ADMIN_SESSION_COOKIE = 'djossi_admin_session';
const SESSION_DURATION_HOURS = Number(process.env.ADMIN_SESSION_TTL_HOURS || 12);

export interface AdminSession {
  email: string;
  role: 'admin';
  iat: number;
  exp: number;
}

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET || 'djossi-admin-dev-secret';
}

function getExpectedAdminEmail(): string {
  return process.env.ADMIN_EMAIL || 'admin@djossi.ci';
}

function getExpectedAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'admin123456';
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
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value) as unknown as BufferSource);
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

export function isAdminCredentialsConfigured(): boolean {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
}

export function getAdminCredentialHints() {
  return {
    email: getExpectedAdminEmail(),
    configured: isAdminCredentialsConfigured(),
    sessionDurationHours: SESSION_DURATION_HOURS,
  };
}

export async function validateAdminCredentials(email: string, password: string): Promise<boolean> {
  return email === getExpectedAdminEmail() && password === getExpectedAdminPassword();
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

export async function verifyAdminSessionToken(token?: string | null): Promise<AdminSession | null> {
  if (!token) return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const isValid = await verifySignature(payload, signature);
  if (!isValid) return null;

  try {
    const parsed = JSON.parse(decodeBase64Url(payload)) as AdminSession;
    if (parsed.role !== 'admin' || parsed.exp * 1000 <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || cookieStore.get(LEGACY_ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}

export async function getAdminSessionFromRequest(request: NextRequest): Promise<AdminSession | null> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || request.cookies.get(LEGACY_ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}

export async function requireAdminSession(nextPath: string = '/admin'): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
  return session;
}
