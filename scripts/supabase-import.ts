/**
 *  TravaillerenCi — scripts/supabase-import.ts
 *
 *  IMPORT ONE-SHOT : copie les offres existantes du SQLite local
 *  (data/djossi-ci.sqlite3) vers Supabase (public.job_offers).
 *
 *  Prérequis :
 *    - Le projet Supabase est créé et les migrations 0001→0004 appliquées.
 *    - Les variables d'env suivantes sont définies (terminal ou .env.local) :
 *        NEXT_PUBLIC_SUPABASE_URL
 *        SUPABASE_SERVICE_ROLE_KEY
 *
 *  Usage :
 *    npx tsx scripts/supabase-import.ts
 *
 *  NB : l'import est idempotent — il ne crée pas de doublons (dédup par
 *  source_url OU titre+entreprise, comme le scraper).
 */
import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

/** Charge les variables d'env du fichier .env.local (tsx ne le fait pas). */
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '❌ Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const dbPath = path.join(process.cwd(), 'data', 'djossi-ci.sqlite3');
const db = new DatabaseSync(dbPath);

type SqliteOffer = Record<string, unknown>;

const rows = db
  .prepare(
    `SELECT id, title, company, location, contract_type, description,
            apply_link, apply_email, source_url, source_website, status,
            seo_title, seo_description, seo_keywords, slug,
            is_verified, is_archived, is_expired, clicks_count,
            created_at, updated_at
     FROM job_offers ORDER BY created_at ASC`,
  )
  .all() as unknown as SqliteOffer[];

console.log(`📦 ${rows.length} offre(s) lues depuis SQLite.`);

const toBool = (v: unknown) => v === 1 || v === true;

async function findExisting(sourceUrl: string | null, title: string, company: string) {
  if (sourceUrl) {
    const { data } = await supabase
      .from('job_offers')
      .select('id')
      .eq('source_url', sourceUrl)
      .maybeSingle();
    if (data) return data.id as string;
  }
  if (title && company) {
    const { data } = await supabase
      .from('job_offers')
      .select('id')
      .eq('title', title)
      .eq('company', company)
      .limit(1);
    if (data && data.length > 0) return data[0].id as string;
  }
  return null;
}

let inserted = 0;
let updated = 0;
let failed = 0;

for (const row of rows) {
  const title = String(row.title ?? '').trim();
  const company = String(row.company ?? '').trim();
  if (!title || !company) {
    failed += 1;
    continue;
  }

  const apply_link = (row.apply_link as string | null) || null;
  const apply_email = (row.apply_email as string | null) || null;

  const payload = {
    title,
    company,
    location: String(row.location ?? ''),
    contract_type: String(row.contract_type ?? 'CDI'),
    description: String(row.description ?? ''),
    apply_link,
    apply_email,
    source_url: (row.source_url as string | null) || null,
    source_website: (row.source_website as string | null) || null,
    status: String(row.status ?? 'pending'),
    seo_title: (row.seo_title as string | null) || null,
    seo_description: (row.seo_description as string | null) || null,
    seo_keywords: (row.seo_keywords as string | null) || null,
    slug: (row.slug as string | null) || null,
    is_verified: toBool(row.is_verified),
    is_archived: toBool(row.is_archived),
    is_expired: toBool(row.is_expired),
    clicks_count: Number(row.clicks_count || 0),
    created_at: row.created_at
      ? new Date(String(row.created_at)).toISOString()
      : new Date().toISOString(),
  };

  try {
    const existingId = await findExisting(
      payload.source_url,
      payload.title,
      payload.company,
    );

    if (existingId) {
      const { error } = await supabase
        .from('job_offers')
        .update(payload)
        .eq('id', existingId);
      if (error) throw error;
      updated += 1;
      console.log(`  ↻ MAJ     : ${payload.title} @ ${payload.company}`);
    } else {
      const { error } = await supabase.from('job_offers').insert(payload);
      if (error) throw error;
      inserted += 1;
      console.log(`  ➕ AJOUT  : ${payload.title} @ ${payload.company}`);
    }
  } catch (err) {
    failed += 1;
    console.error(
      `  ❌ ÉCHEC  : ${payload.title} — ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

db.close();

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✅ Import terminé : ${inserted} ajoutée(s), ${updated} mise(s) à jour, ${failed} échec(s).`);
console.log('Vous pouvez vérifier dans Supabase Dashboard > Table Editor > job_offers.');
