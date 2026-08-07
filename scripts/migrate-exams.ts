/**
 *  TravaillerEnCi — Script de migration : job_offers (category='exam') → exams
 *  Chemin : scripts/migrate-exams.ts
 *
 *  Copie les anciens concours stockés dans le dépôt unifié `job_offers` vers la
 *  table dédiée `exams` (module Concours Administratifs), puis ARCHIVE les
 *  lignes sources (status='archived', is_archived=1) pour ne plus les afficher
 *  sur la page /concours historique.
 *
 *  USAGE :
 *    npx tsx scripts/migrate-exams.ts          # migration réelle
 *    npx tsx scripts/migrate-exams.ts --dry   # simulation seule
 *
 *  Fonctionne en SQLite local (data/travaillerenci.sqlite3) ET en Supabase
 *  (si NEXT_PUBLIC_DB_PROVIDER=supabase + clés d'env présentes).
 */

import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DB_PATH = resolve(ROOT, 'data', 'travaillerenci.sqlite3');

const DRY = process.argv.includes('--dry');
const provider = process.env.NEXT_PUBLIC_DB_PROVIDER || 'sqlite';
const useSupabase =
  provider === 'supabase' &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Catégorie exams déduite de l'organisateur (meilleur effort). */
function guessCategory(organizer: string, title: string): string {
  const t = `${organizer} ${title}`.toLowerCase();
  if (/(infas|infirmier|sage-femme|santé|sante|médical|medical)/.test(t)) return 'sante';
  if (/(cafop|instituteur|enseignant|professeur|men-deco|éducation|education)/.test(t)) return 'enseignement';
  if (/(gendarmerie|armée|armee|militaire|zambakro|ensoa|défense|defense)/.test(t)) return 'militaire';
  if (/(police|douane|eaux et forêts|gardien)/.test(t)) return 'securite';
  return 'administratif';
}

async function migrateSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log('🔵 Migration Supabase…');

  const { data: rows, error } = await supabase
    .from('job_offers')
    .select('*')
    .eq('category', 'exam');
  if (error) throw new Error(`Lecture job_offers : ${error.message}`);
  console.log(`   ${rows.length} ancien(s) concours trouvé(s) dans job_offers.`);

  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    const organizer = (row.company || '').trim();
    const title = (row.title || '').trim();
    if (!organizer || !title) {
      skipped++;
      continue;
    }
    // Déduplication : titre + organisateur déjà présents dans exams ?
    const { data: existing } = await supabase
      .from('exams')
      .select('id')
      .or(`source_url.eq.${row.source_url || 'x'},and(title.eq.${title},organizer.eq.${organizer})`)
      .limit(1);
    if (existing && existing.length > 0) {
      skipped++;
    } else {
      if (!DRY) {
        const { error: insertError } = await supabase.from('exams').insert({
          title,
          slug: row.slug || null,
          organizer,
          category: guessCategory(organizer, title),
          status: row.status || 'pending',
          description_md: row.description || '',
          registration_end: row.deadline || null,
          source_url: row.source_url || null,
          source_website: row.source_website || null,
          confidence: 'medium',
          is_verified: row.is_verified === true,
          seo_title: row.seo_title || null,
          seo_description: row.seo_description || null,
          seo_keywords: row.seo_keywords || null,
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
        });
        if (insertError) {
          console.warn(`   ⚠ Insertion échouée pour « ${title} » : ${insertError.message}`);
          skipped++;
          continue;
        }
      }
      migrated++;
    }

    if (!DRY) {
      await supabase
        .from('job_offers')
        .update({ status: 'archived', is_archived: true })
        .eq('id', row.id);
    }
  }

  console.log(`   ✅ ${migrated} migré(s), ${skipped} ignoré(s)${DRY ? ' (simulation — aucune écriture)' : ''}.`);
}

function migrateSqlite() {
  console.log('🟢 Migration SQLite…');
  if (!existsSync(DB_PATH)) {
    console.log('   Aucune base SQLite locale — rien à migrer.');
    return;
  }
  const db = new DatabaseSync(DB_PATH);
  try {
    // La table exams peut ne pas exister encore si le service n'a pas tourné.
    db.exec(`
      CREATE TABLE IF NOT EXISTS exams (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT,
        organizer TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'administratif',
        exam_type TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        description_md TEXT NOT NULL DEFAULT '',
        registration_start TEXT,
        registration_end TEXT,
        exam_date TEXT,
        results_date TEXT,
        age_min INTEGER,
        age_max INTEGER,
        age_reference_date TEXT,
        nationality TEXT,
        diplomas TEXT NOT NULL DEFAULT '[]',
        min_diploma_level INTEGER,
        positions_count INTEGER,
        registration_fee TEXT,
        location TEXT,
        cities TEXT NOT NULL DEFAULT '[]',
        documents TEXT NOT NULL DEFAULT '[]',
        source_url TEXT,
        source_website TEXT,
        confidence TEXT NOT NULL DEFAULT 'medium',
        views_count INTEGER NOT NULL DEFAULT 0,
        is_verified INTEGER NOT NULL DEFAULT 0,
        seo_title TEXT,
        seo_description TEXT,
        seo_keywords TEXT,
        published_at TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `);

    const rows = db
      .prepare(`SELECT * FROM job_offers WHERE category = 'exam'`)
      .all() as Array<Record<string, any>>;
    console.log(`   ${rows.length} ancien(s) concours trouvé(s) dans job_offers.`);

    let migrated = 0;
    let skipped = 0;
    const insert = db.prepare(`
      INSERT OR IGNORE INTO exams (
        title, slug, organizer, category, status, description_md, registration_end,
        source_url, source_website, confidence, is_verified, seo_title, seo_description,
        seo_keywords, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const row of rows) {
      const organizer = String(row.company || '').trim();
      const title = String(row.title || '').trim();
      if (!organizer || !title) {
        skipped++;
        continue;
      }
      const res = DRY
        ? { changes: 1 }
        : insert.run(
            title,
            row.slug || null,
            organizer,
            guessCategory(organizer, title),
            row.status || 'pending',
            row.description || '',
            row.deadline || null,
            row.source_url || null,
            row.source_website || null,
            'medium',
            row.is_verified ? 1 : 0,
            row.seo_title || null,
            row.seo_description || null,
            row.seo_keywords || null,
            row.created_at || new Date().toISOString(),
            row.updated_at || new Date().toISOString(),
          );
      if (res.changes > 0) {
        migrated++;
      } else {
        skipped++;
      }
      if (!DRY) {
        db.prepare(`UPDATE job_offers SET status = 'archived', is_archived = 1 WHERE id = ?`).run(row.id);
      }
    }
    console.log(`   ✅ ${migrated} migré(s), ${skipped} ignoré(s)${DRY ? ' (simulation — aucune écriture)' : ''}.`);
  } finally {
    db.close();
  }
}

async function main() {
  if (useSupabase) {
    await migrateSupabase();
  } else {
    mkdirSync(resolve(ROOT, 'data'), { recursive: true });
    migrateSqlite();
  }
  console.log('\nTerminé. Les concours migrés sont à modérer/publier dans /admin/exams.');
}

main().catch((err) => {
  console.error('❌ Migration échouée :', err);
  process.exit(1);
});
