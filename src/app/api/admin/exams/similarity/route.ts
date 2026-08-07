/**
 *  TravaillerEnCi — POST /api/admin/exams/similarity
 *  Contrôle anti-duplication (PARTIE 2 — §2.6) côté modération.
 *
 *  Reçoit { description_md, source_url } (valeurs du formulaire admin, même
 *  non enregistrées), récupère le texte du communiqué officiel à l'URL source
 *  et calcule la similarité source ↔ description. Le résultat guide la
 *  réécriture manuelle : > 30 % → la fiche doit être retravaillée.
 */
import { lookup } from 'node:dns/promises';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminApi } from '@/lib/adminSession';
import { SIMILARITY_THRESHOLD, needsRewrite, textSimilarity } from '@/lib/similarityCheck';

export const maxDuration = 30;

const MAX_HTML_CHARS = 3_000_000; // garde-fou anti page démesurée
const MAX_REDIRECTS = 3;

/** Plages réseau interdites (anti-SSRF : pas d'accès au réseau interne). */
function isBlockedIp(ip: string): boolean {
  if (ip === '::1' || ip === '::' || ip === '0.0.0.0') return true;
  if (ip.startsWith('127.')) return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true; // y compris 169.254.169.254 (métadonnées)
  if (ip.startsWith('172.')) {
    const second = Number(ip.split('.')[1]);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // IPv6 ULA
  return false;
}

/** Vérifie qu'une URL pointe vers une adresse publique (DNS inclus). */
async function assertPublicUrl(rawUrl: string): Promise<void> {
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Seules les URLs http/https sont acceptées.');
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.localhost')) {
    throw new Error('Accès aux adresses locales interdit (sécurité).');
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')) {
    if (isBlockedIp(hostname)) throw new Error('Accès aux adresses locales interdit (sécurité).');
    return;
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((a) => isBlockedIp(a.address))) {
    throw new Error('Accès aux adresses locales interdit (sécurité).');
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    // Entités numériques (React/Next échappe les apostrophes en &#x27;…) :
    // doivent être décodées AVANT la normalisation, sinon les tokens ne
    // correspondent pas (« d&#x27;inscription » ≠ « d'inscription »).
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchSourceText(sourceUrl: string): Promise<{ text: string; contentType: string }> {
  // Anti-SSRF : chaque saut de redirection est revalidé (max 3).
  let current = sourceUrl;
  let res: Response | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(current);
    res = await fetch(current, {
      headers: {
        // UA générique : certains sites institutionnels rejettent les clients sans UA.
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const location = res.headers.get('location')!;
      current = new URL(location, current).toString();
      continue;
    }
    break;
  }
  if (!res) throw new Error('La source officielle est injoignable.');
  if (!res.ok) {
    throw new Error(`La source officielle a répondu HTTP ${res.status}.`);
  }
  const contentType = res.headers.get('content-type') || '';
  const length = Number(res.headers.get('content-length') || 0);
  if (length > MAX_HTML_CHARS) {
    throw new Error('La page source est trop volumineuse pour être analysée.');
  }
  const raw = await res.text();
  if (raw.length > MAX_HTML_CHARS) {
    throw new Error('La page source est trop volumineuse pour être analysée.');
  }
  return { text: htmlToText(raw), contentType };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const description = typeof body.description_md === 'string' ? body.description_md.trim() : '';
    const sourceUrl = typeof body.source_url === 'string' ? body.source_url.trim() : '';

    if (!description) {
      return NextResponse.json(
        { error: 'La description (description_md) est obligatoire.' },
        { status: 400 },
      );
    }
    if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
      return NextResponse.json(
        {
          error:
            'Le lien officiel (source_url) est obligatoire pour comparer avec le communiqué source.',
        },
        { status: 400 },
      );
    }

    let sourceText: string;
    let contentType = '';
    try {
      const fetched = await fetchSourceText(sourceUrl);
      sourceText = fetched.text;
      contentType = fetched.contentType;
    } catch (err) {
      const message =
        err instanceof Error &&
        (err.message.startsWith('La source officielle') ||
          err.message.includes('adresses locales') ||
          err.message.includes('URLs http'))
          ? err.message
          : 'Impossible de récupérer la source officielle (site injoignable, délai dépassé ou page bloquée).';
      return NextResponse.json(
        {
          error: message,
          needsRewrite: null,
          score: null,
        },
        { status: 422 },
      );
    }

    // Communiqués en PDF : l'extraction du texte nécessiterait un parseur PDF
    // (non embarqué) — on le signale clairement plutôt que de comparer du bruit.
    if (/pdf|octet-stream|application\/zip/i.test(contentType)) {
      return NextResponse.json({
        score: null,
        threshold: SIMILARITY_THRESHOLD,
        needsRewrite: null,
        message:
          'La source est un document PDF : comparaison automatique non supportée — vérification manuelle recommandée.',
        sourcePreview: '',
        sourceLength: 0,
        descriptionLength: description.length,
        sourceIsPdf: true,
      });
    }

    if (sourceText.length < 40) {
      return NextResponse.json(
        {
          error:
            'Le texte extrait de la source est trop court ou illisible (page dynamique ?). Vérification manuelle recommandée.',
          needsRewrite: null,
          score: null,
        },
        { status: 422 },
      );
    }

    const score = textSimilarity(sourceText, description);
    const aboveThreshold = needsRewrite(sourceText, description);

    return NextResponse.json({
      score: Math.round(score * 1000) / 1000,
      threshold: SIMILARITY_THRESHOLD,
      needsRewrite: aboveThreshold,
      message: aboveThreshold
        ? `Similarité ${Math.round(score * 100)} % — AU-DELÀ du seuil (${Math.round(SIMILARITY_THRESHOLD * 100)} %) : la description doit être réécrite dans vos propres mots avant publication.`
        : `Similarité ${Math.round(score * 100)} % — sous le seuil (${Math.round(SIMILARITY_THRESHOLD * 100)} %) : reformulation conforme.`,
      sourcePreview: sourceText.slice(0, 240),
      sourceLength: sourceText.length,
      descriptionLength: description.length,
      sourceIsPdf: false,
    });
  } catch (err) {
    console.error('POST /api/admin/exams/similarity error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur lors de la vérification.' },
      { status: 500 },
    );
  }
}
