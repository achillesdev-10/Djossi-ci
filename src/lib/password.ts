import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 *  TravaillerEnCi — src/lib/password.ts
 *  Hachage de mots de passe côté serveur (scrypt de node:crypto).
 *
 *  Format stocké : `<salt hex>:<hash hex>` (64 octets de hash, sel 16 octets).
 *  Aucune dépendance externe — node:crypto suffit.
 */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  try {
    const candidate = scryptSync(password, salt, 64);
    const storedBuffer = Buffer.from(hash, 'hex');
    if (candidate.length !== storedBuffer.length) return false;
    return timingSafeEqual(candidate, storedBuffer);
  } catch {
    return false;
  }
}
