/**
 *  TravaillerEnCi — Script de BDD locale (SQLite) : migration du schéma
 *  Chemin : scripts/sqlite-setup.ts
 *
 *  ⚠️ AUCUNE donnée de démonstration : ce script ne fait QUE créer / mettre à
 *  jour le schéma. Les contenus proviennent UNIQUEMENT du scraper
 *  (`python scraper/scraper.py`) qui collecte des offres, stages, bourses et
 *  concours RÉELS, en attente de modération dans le dashboard admin.
 *
 *  USAGE :
 *    # Exécuter la migration + vérification
 *    npx tsx scripts/sqlite-setup.ts
 *
 *    # Effacer complètement la BDD et tout recréer
 *    npx tsx scripts/sqlite-setup.ts --reset
 *
 *  Base de données produite : ./data/travaillerenci.sqlite3
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(ROOT, 'data');
const DB_PATH = resolve(DATA_DIR, 'travaillerenci.sqlite3');

// -----------------------------------------------------------------------------
// 1. Gestion CLI
// -----------------------------------------------------------------------------
const ARGS = new Set(process.argv.slice(2));
const RESET = ARGS.has('--reset') || ARGS.has('-f');
const DRY_RUN = ARGS.has('--dry-run');

// -----------------------------------------------------------------------------
// 2. Exécution
// -----------------------------------------------------------------------------
function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  if (RESET && existsSync(DB_PATH)) {
    console.log(`🧹 --reset : suppression de ${DB_PATH}`);
    if (!DRY_RUN) unlinkSync(DB_PATH);
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — aucune modification sur la BDD.');
    console.log(`   → Chemin BDD cible : ${DB_PATH}`);
    return;
  }

  const db = new DatabaseSync(DB_PATH);

  try {
    runMigration(db);
    runVerification(db);
  } finally {
    db.close();
    console.log(`\n✅ BDD prête : ${DB_PATH} (aucune donnée de démonstration ajoutée)`);
  }
}

// -----------------------------------------------------------------------------
// 3. Migration — Miroir 1:1 du schéma Supabase (sauf types)
// -----------------------------------------------------------------------------
function runMigration(db: DatabaseSync) {
  console.log('🏗  Création / mise à jour du schéma `job_offers`…');

  db.exec(`
    CREATE TABLE IF NOT EXISTS job_offers (
      id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      category        TEXT NOT NULL DEFAULT 'job' CHECK (category IN ('job','internship','scholarship','exam')),
      title           TEXT NOT NULL,
      company         TEXT NOT NULL,
      location        TEXT NOT NULL,
      contract_type   TEXT NOT NULL,
      description     TEXT NOT NULL,
      apply_link      TEXT,
      apply_email     TEXT,
      source_url      TEXT,
      source_website  TEXT,
      status          TEXT NOT NULL DEFAULT 'pending',
      seo_title       TEXT,
      seo_description TEXT,
      seo_keywords    TEXT,
      slug            TEXT,
      is_verified     INTEGER NOT NULL DEFAULT 0,
      is_archived     INTEGER NOT NULL DEFAULT 0,
      is_expired      INTEGER NOT NULL DEFAULT 0,
      clicks_count    INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

      CONSTRAINT valid_contract_type CHECK (
        contract_type IN ('CDI','CDD','Stage','Prestation','Alternance','Freelance')
      ),
      CONSTRAINT valid_status CHECK (
        status IN ('pending','published','rejected','archived')
      ),
      CONSTRAINT valid_is_verified CHECK (is_verified IN (0,1)),
      CONSTRAINT valid_is_archived CHECK (is_archived IN (0,1)),
      CONSTRAINT valid_is_expired CHECK (is_expired IN (0,1)),
      CONSTRAINT valid_apply_method CHECK (
        apply_link IS NOT NULL OR apply_email IS NOT NULL
      ),
      CONSTRAINT unique_title_company UNIQUE (title, company)
    );
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_location   ON job_offers (location);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_contract   ON job_offers (contract_type);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_status     ON job_offers (status);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_category   ON job_offers (category);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON job_offers (created_at DESC);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_verified   ON job_offers (is_verified DESC, created_at DESC);`);

  // Migration défensive pour les bases créées par une ancienne version.
  const cols = db.prepare('PRAGMA table_info(job_offers)').all() as Array<{ name: string }>;
  const existing = new Set(cols.map((c) => String(c.name)));
  if (!existing.has('category')) {
    db.exec("ALTER TABLE job_offers ADD COLUMN category TEXT NOT NULL DEFAULT 'job'");
  }
  if (!existing.has('deadline')) {
    db.exec('ALTER TABLE job_offers ADD COLUMN deadline TEXT');
  }
  if (!existing.has('clicks_count')) {
    db.exec('ALTER TABLE job_offers ADD COLUMN clicks_count INTEGER NOT NULL DEFAULT 0');
  }

  // Suppression d'un éventuel trigger obsolète (évite la récursion infinie en SQLite)
  db.exec(`DROP TRIGGER IF EXISTS trigger_jobs_set_updated_at;`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS scraper_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      status          TEXT NOT NULL,
      offers_added    INTEGER NOT NULL DEFAULT 0,
      message         TEXT,
      started_at      TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at     TEXT
    );
  `);

  console.log('   ✓ Schéma `job_offers` prêt (catégories : job / internship / scholarship / exam).');
}

// -----------------------------------------------------------------------------
// 4. Vérification — affichage récapitulatif
// -----------------------------------------------------------------------------
function runVerification(db: DatabaseSync) {
  console.log('\n🔍 Vérification contenu BDD :');

  const count = db.prepare('SELECT COUNT(*) AS c FROM job_offers').get() as { c: number };
  console.log(`   → Total contenus dans job_offers : ${count.c}`);

  const byCategory = db
    .prepare('SELECT category, COUNT(*) AS c FROM job_offers GROUP BY category ORDER BY c DESC')
    .all() as Array<{ category: string; c: number }>;

  byCategory.forEach((row) => {
    console.log(`   → ${row.category.padEnd(12)} : ${row.c}`);
  });

  const rows = db
    .prepare(
      `SELECT id, category, title, company, status, is_verified, created_at
       FROM job_offers
       ORDER BY created_at DESC
       LIMIT 5;`
    )
    .all() as unknown as Array<{
    id: string;
    category: string;
    title: string;
    company: string;
    status: string;
    is_verified: number;
    created_at: string;
  }>;

  rows.forEach((row, i) => {
    const badge = row.is_verified ? '✅ VERIFIED' : '⚪  ';
    const shortId = row.id.slice(0, 8) + '…';
    console.log(
      `   ${String(i + 1).padStart(2, '0')}. ${badge} [${row.category.padEnd(11)}] status=${row.status.padEnd(10)} ${row.title.slice(0, 40).padEnd(40)} @ ${row.company} (${shortId})`
    );
  });
}

main();
