/**
 *  TravaillerEnCi — src/lib/site.ts
 *  URL publique du site, CENTRALISÉE.
 *
 *  Contexte : le domaine « travaillerenci.ci » n'est pas (encore) actif —
 *  le site est servi sur https://travaillerenci.vercel.app. Toutes les
 *  métadonnées (og:url, canonical, sitemap, robots, JSON-LD) et les liens de
 *  partage doivent donc pointer vers l'URL réellement servie, en gardant la
 *  possibilité de basculer sur le domaine définitif via une variable
 *  d'environnement le jour venu.
 *
 *  Priorité :  NEXT_PUBLIC_SITE_URL (défini dans l'env)  >  localhost (dev)
 *              >  https://travaillerenci.vercel.app (défaut prod actuel).
 */

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3000';
  return 'https://travaillerenci.vercel.app';
}

/** Hostname (sans protocole) — ex. « travaillerenci.vercel.app ». */
export function getSiteHostname(): string {
  try {
    return new URL(getSiteUrl()).hostname;
  } catch {
    return 'travaillerenci.vercel.app';
  }
}
