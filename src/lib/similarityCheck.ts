/**
 *  TravaillerEnCi — src/lib/similarityCheck.ts
 *  Contrôle anti-duplication (PARTIE 2 — §2.6) — miroir TypeScript de
 *  scraper/core/similarity_check.py (utilisé côté admin /admin/exams).
 *
 *  Le seuil est partagé : une réécriture dont la similarité avec la source
 *  dépasse 30 % doit être retravaillée avant publication.
 */
export const SIMILARITY_THRESHOLD = 0.3;

// Caractères « bruit » (Markdown, ponctuation, séparateurs).
const NOISE_RE =
  /[*#_`>\[\](){}|!?.,;:'"«»<>/\\\n\r\t—–…·•]+/g;

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // suppression des accents
    .replace(NOISE_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokens(text: string): string[] {
  return normalizeText(text).split(/\s+/).filter(Boolean);
}

/** n-grams de tokens (défaut 4) — insensible à l'ordre local des phrases. */
function ngrams(list: string[], n = 4): Set<string> {
  const out = new Set<string>();
  if (list.length < n) {
    if (list.length > 0) out.add(list.join(' '));
    return out;
  }
  for (let i = 0; i <= list.length - n; i++) {
    out.add(list.slice(i, i + n).join(' '));
  }
  return out;
}

/**
 * Ratio de plus longue sous-séquence commune (2·LCS/(|a|+|b|)) sur les tokens
 * — détecte les copier-coller et reformulations trop fidèles. DP itératif à
 * deux lignes (mémoire bornée) ; les listes sont tronquées à 2000 tokens.
 */
function lcsRatio(a: string[], b: string[]): number {
  const A = a.slice(0, 2000);
  const B = b.slice(0, 2000);
  if (A.length === 0 || B.length === 0) return 0;
  let prev = new Array<number>(B.length + 1).fill(0);
  for (let i = 1; i <= A.length; i++) {
    const curr = new Array<number>(B.length + 1).fill(0);
    for (let j = 1; j <= B.length; j++) {
      curr[j] = A[i - 1] === B[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return (2 * prev[B.length]) / (A.length + B.length);
}

/** Similarité 0..1 entre le texte source et la réécriture (max des mesures). */
export function textSimilarity(source: string, rewritten: string): number {
  const a = tokens(source);
  const b = tokens(rewritten);
  if (a.length === 0 || b.length === 0) return 0;

  const seq = lcsRatio(a, b);

  const sourceGrams = ngrams(a);
  const descGrams = ngrams(b);
  let inter = 0;
  for (const g of descGrams) if (sourceGrams.has(g)) inter++;
  const union = new Set([...descGrams, ...sourceGrams]);
  const jaccard = union.size === 0 ? 0 : inter / union.size;
  // Couverture (DIRECTIONNELLE) : part des n-grams de la DESCRIPTION présents
  // dans la source — pertinente quand la source (page complète) est bien plus
  // longue que la description : une copie partielle reste détectée.
  const coverage = descGrams.size === 0 ? 0 : inter / descGrams.size;

  return Math.max(seq, jaccard, coverage);
}

/** True si la réécriture est trop proche de la source (> seuil). */
export function needsRewrite(
  source: string,
  rewritten: string,
  threshold: number = SIMILARITY_THRESHOLD,
): boolean {
  return textSimilarity(source, rewritten) > threshold;
}
