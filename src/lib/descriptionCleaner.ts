/**
 *  TravaillerEnCi — src/lib/descriptionCleaner.ts
 *  Miroir TypeScript de scraper/core/cleaner.py (mêmes heuristiques).
 *
 *  Nettoie une description scrapée brute (header/footer de la page source,
 *  publicités, autres offres…) et la structure en Markdown lisible :
 *  sections « ## », puces « - », mots coupés réassemblés, lignes vides pliées.
 */

// Marqueurs FORTS : toujours considérés comme du bruit de fin de page.
const STRONG_FOOTER_MARKERS = [
  'avis important aux candidats',
  "ne versez jamais d'argent",
  'ne versez jamais d’argent',
  'méfiez-vous des frais',
  'signalez toute activité',
  'décline toute responsabilité',
  'signaler un abus',
  'signaler une erreur ou un abus',
  'signaler une erreur',
  'plainte@',
  'expire bientôt',
  'expire bientot',
];

// Marqueurs FAIBLES : on ne coupe QUE si la ligne ressemble à du bruit d'UI
// (compteur social, encart publicitaire, « Voir tout » isolé) — pas si le mot
// apparaît dans une phrase légitime (ex. « gestion de la publicité »).
const WEAK_FOOTER_PATTERNS = [
  /^[\-–—•]?\s*\d[\d\s\u00a0.,]*\s*(fans|suiveurs|abonn)/i,
  /^[\-–—•]?\s*(publicité|publicite)\s*[\-–—•]*\s*$/i,
  /^voir (tout|plus)$/i,
];

const META_PATTERNS = [
  /^emploi\s*\(/i,
  /^postuler\s*$/i,
  /^partager\s*$/i,
  /^whatsapp\s*$/i,
  /^(secteur|lieu|niveau|date limite|publi[eé]e le)\b/i,
  /^\d+[\s\u00a0]?vues?$/i,
  /^pour signaler/i,
  /^plainte@/i,
  /^cliquez ici/i,
  /^suivre\s*$/i,
  /^s'abonner\s*$/i,
  /^partager sur/i,
];

const SECTION_HEADERS = new Set([
  'activites', 'activités', 'missions', 'mission', 'mission principale',
  'missions principales', 'profil', 'profil recherche', 'profil recherché',
  'savoir faire', 'savoir etre', 'savoir-être', 'savoir être',
  'qualifications', 'responsabilites', 'responsabilités', 'conditions',
  'type de contrat', 'description du poste', "description de l'offre",
  'description de l’offre', 'avantages', 'benefices', 'bénéfices',
  'comment postuler', 'candidature', 'nous offrons', 'profil du candidat',
  'exigences du poste', 'votre profil', 'vos missions', 'le poste',
  'qui sommes-nous ?', 'qui sommes-nous', "à propos de l'entreprise",
  'à propos de l’entreprise', 'entreprise', 'information',
]);

const ALL_CAPS_HEADER = /^[A-ZÀÂÇÉÈÊËÎÏÔÛÙÜŸ][A-ZÀÂÇÉÈÊËÎÏÔÛÙÜŸ0-9 .\-'’]{2,45}$/;

const VOWEL_LETTERS = new Set([...'àaéèêëîïôöùüyé']);

function isFooter(line: string): boolean {
  const low = line.trim().toLowerCase();
  if (STRONG_FOOTER_MARKERS.some((m) => low.includes(m))) return true;
  return WEAK_FOOTER_PATTERNS.some((p) => p.test(low));
}

function isMeta(line: string): boolean {
  return META_PATTERNS.some((p) => p.test(line));
}

function isSectionHeader(line: string): string | null {
  const stripped = line.trim().replace(/^\*+|\*+$/g, '').replace(/:$/, '');
  if (!stripped || stripped.length > 50) return null;
  const low = stripped.toLowerCase().trim();
  if (SECTION_HEADERS.has(low)) return stripped;
  if (ALL_CAPS_HEADER.test(stripped) && stripped.length >= 4) return stripped;
  return null;
}

function looksLikeTitle(line: string, title?: string | null): boolean {
  if (!title) return false;
  return line.toLowerCase().trim() === title.toLowerCase().trim();
}

function joinSplitWords(lines: string[]): string[] {
  const result: string[] = [];
  for (const line of lines) {
    if (result.length === 0) {
      result.push(line);
      continue;
    }
    const prev = result[result.length - 1].trimEnd();
    const words = prev.split(' ');
    const lastWordRaw = words[words.length - 1] || '';
    const lastWord = lastWordRaw.replace(/['’]/g, '');
    let merged = false;
    if (lastWord.length <= 1 && line && /^[a-z@]/.test(line)) {
      if (VOWEL_LETTERS.has(lastWord.toLowerCase())) {
        result[result.length - 1] = `${prev} ${line}`;
      } else {
        // Fragment de mot coupé : « afin de p » + « iloter » → « piloter »
        result[result.length - 1] = `${prev}${line}`;
      }
      merged = true;
    } else if (lastWord.length <= 2 && prev.length <= 20 && line && /^[a-z]/.test(line)) {
      result[result.length - 1] = `${prev} ${line}`;
      merged = true;
    }
    if (!merged) result.push(line);
  }
  return result;
}

function normalizeBullets(lines: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const stripped = line.trim();
    const m = stripped.match(/^[\-–—•▪◦]\s*(.*)$/);
    const content = m ? m[1].trim() : stripped;
    if (!content) continue;
    // Lignes orphelines de ponctuation (« . », « : »…) laissées par le HTML.
    if (/^[.…,;:!?]+\s*$/.test(content)) continue;
    if (seen.has(content)) continue;
    seen.add(content);
    out.push(m ? `- ${content}` : content);
  }
  return out;
}

function collapseBlankLines(lines: string[]): string[] {
  const out: string[] = [];
  let prevBlank = false;
  for (const line of lines) {
    if (!line.trim()) {
      if (!prevBlank && out.length > 0) out.push('');
      prevBlank = true;
    } else {
      out.push(line.trim());
      prevBlank = false;
    }
  }
  while (out.length > 0 && !out[out.length - 1].trim()) out.pop();
  return out;
}

export function cleanDescription(
  raw: string,
  title?: string | null
): string {
  if (!raw) return '';

  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let lines = text.split('\n');

  // 1. Ancre « Détails de l'offre » (header ignoré).
  let anchorIndex: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (/d[ée]tails de l'offre/i.test(lines[i]) || /d[ée]tails de l’offre/i.test(lines[i])) {
      anchorIndex = i;
      break;
    }
  }

  if (anchorIndex !== null) {
    lines = lines.slice(anchorIndex + 1);
  } else {
    lines = lines.filter((l) => !isMeta(l));
  }

  // 2. Collecte jusqu'au footer.
  const collected: string[] = [];
  let started = anchorIndex !== null;
  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) {
      if (started) collected.push('');
      continue;
    }
    if (isFooter(stripped)) break;
    if (!started) {
      if (isMeta(stripped)) continue;
      if (stripped.length < 12 && !isSectionHeader(stripped)) continue;
      started = true;
    }
    if (looksLikeTitle(stripped, title)) continue;
    collected.push(stripped);
  }

  if (collected.filter((l) => l.trim()).length === 0) {
    lines.forEach((l) => l.trim() && collected.push(l.trim()));
  }

  // 3. Structuration Markdown.
  const structured: string[] = [];
  for (const line of collected) {
    const header = isSectionHeader(line);
    if (header) {
      structured.push('', `## ${header}`, '');
    } else {
      structured.push(line);
    }
  }

  let result = collapseBlankLines(
    normalizeBullets(joinSplitWords(structured))
  ).join('\n').trim();

  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.replace(/^[-–—]\s*$/gm, '');

  if (result.length > 12000) {
    result = result.slice(0, 12000).split('\n').slice(0, -1).join('\n');
  }

  return result.trim();
}
