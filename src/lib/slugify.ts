/**
 * Slugify une chaîne en identifiant d'URL : minuscules, sans accents,
 * espaces et caractères spéciaux remplacés par des tirets.
 * Module pur (aucune dépendance serveur) — utilisable côté client.
 */
export function slugify(input: string): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
