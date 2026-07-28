import { SITE_CONFIG } from './constants';

export function formatPageTitle(title?: string): string {
  if (!title) return SITE_CONFIG.name;
  return `${title} | ${SITE_CONFIG.name}`;
}

export function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value
          .filter((v) => v !== undefined && v !== null && v !== '')
          .map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`)
          .join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    });
  const qs = entries.filter(Boolean).join('&');
  return qs ? `?${qs}` : '';
}

export function parseQueryString(query: string): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  if (!query) return params;
  const qs = query.startsWith('?') ? query.slice(1) : query;
  for (const part of qs.split('&')) {
    const [rawKey, rawValue = ''] = part.split('=');
    const key = decodeURIComponent(rawKey);
    const value = decodeURIComponent(rawValue);
    if (key in params) {
      const existing = params[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        params[key] = [existing, value];
      }
    } else {
      params[key] = value;
    }
  }
  return params;
}

export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function isServer(): boolean {
  return typeof window === 'undefined';
}

export function getBaseUrl(): string {
  if (isServer()) {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
  return window.location.origin;
}
