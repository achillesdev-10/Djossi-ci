/**
 *  Djossi.ci — Script de BDD locale (SQLite) : migration + seed
 *  Chemin : scripts/sqlite-setup.ts
 *
 *  Utilise le module natif `node:sqlite` disponible depuis Node 22.
 *  Aucune dépendance externe à compiler.
 *
 *  USAGE :
 *    # Exécuter la migration + seed + vérification
 *    npx tsx scripts/sqlite-setup.ts
 *
 *    # Uniquement ré-initialiser les données sans recréer la table
 *    npx tsx scripts/sqlite-setup.ts --seed-only
 *
 *    # Effacer complètement la BDD et tout recréer
 *    npx tsx scripts/sqlite-setup.ts --reset
 *
 *  Base de données produite : ./data/djossi-ci.sqlite3
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(ROOT, 'data');
const DB_PATH = resolve(DATA_DIR, 'djossi-ci.sqlite3');

type ContractType = 'CDI' | 'CDD' | 'Stage' | 'Prestation' | 'Alternance' | 'Freelance';
type JobStatus = 'pending' | 'published' | 'rejected' | 'archived';

interface JobOfferRow {
  id: string;
  title: string;
  company: string;
  location: string;
  contract_type: ContractType;
  description: string;
  apply_link: string | null;
  apply_email: string | null;
  source_url: string | null;
  source_website: string | null;
  status: JobStatus;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  slug: string | null;
  is_verified: 0 | 1;
  is_archived: 0 | 1;
  is_expired: 0 | 1;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// 1. Gestion CLI
// -----------------------------------------------------------------------------
const ARGS = new Set(process.argv.slice(2));
const RESET = ARGS.has('--reset') || ARGS.has('-f');
const SEED_ONLY = ARGS.has('--seed-only');
const DRY_RUN = ARGS.has('--dry-run');

// -----------------------------------------------------------------------------
// 2. Données de seed — 3 fausses offres ivoiriennes
// -----------------------------------------------------------------------------
const SEED_JOBS: Omit<JobOfferRow, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    title: 'Développeur Full Stack Senior (React / Node.js)',
    company: "MTN Côte d'Ivoire",
    location: 'Abidjan - Plateau',
    contract_type: 'CDI',
    description: `**À propos du poste**\n\nRejoignez l'équipe Digital & Tech de MTN Côte d'Ivoire pour participer à la transformation numérique du leader des télécoms en Côte d'Ivoire. Vous concevrez des applications à fort trafic utilisées par des millions d'abonnés sur le territoire ivoirien (Mobile Money, eShop, support client…).\n\n**Missions principales**\n- Concevoir et maintenir des applications web modernes en Next.js / React et Node.js\n- Collaborer avec les équipes Produit, Design et Infra pour livrer des features en mode Agile\n- Faire de la revue de code, garantir la qualité et les performances\n- Participer à l'architecture technique (microservices, APIs GraphQL, Kafka…)\n\n**Profil recherché**\n- 4+ années d'expérience en développement Full Stack\n- Maîtrise de React, Next.js, TypeScript, Node.js (Express / Fastify)\n- Expérience avec une base de données relationnelle (PostgreSQL de préférence)\n- Connaissance de Docker, CI/CD, cloud AWS / GCP un plus\n- Français courant (lu, écrit, parlé). Anglais technique apprécié.\n\n**Avantages**\n- Salaire attractif : 2 200 000 à 3 200 000 FCFA / mois selon profil\n- Mutuelle familiale + prévoyance\n- Prime de rendement annuelle\n- Tickets restaurant + allocation transport\n- Possibilité de télétravail hybride (3 jours / semaine au siège Plateau)`,
    apply_link: 'https://mtn.ci/recrutement/developpeur-fullstack',
    apply_email: 'recrutement.tech@mtn.ci',
    source_url: 'https://mtn.ci/recrutement',
    source_website: 'MTN CI',
    status: 'published',
    seo_title: "Développeur Full Stack Senior - MTN Côte d'Ivoire",
    seo_description: "Offre d'emploi Développeur Full Stack Senior chez MTN Côte d'Ivoire à Abidjan.",
    seo_keywords: 'developpeur, fullstack, react, nodejs, mtn, abidjan, emploi',
    slug: 'developpeur-fullstack-senior-mtn-ci',
    is_verified: 1,
    is_archived: 0,
    is_expired: 0,
  },
  {
    title: 'Chef de Projet Marketing Digital',
    company: "Société Générale Côte d'Ivoire",
    location: 'Abidjan - Cocody Riviera',
    contract_type: 'CDI',
    description: `**Contexte**\n\nLa Direction Marketing et Communication de Société Générale Côte d'Ivoire recherche un(e) Chef(fe) de Projet Marketing Digital pour piloter la stratégie digitale de la banque, développer sa présence sur les réseaux sociaux et optimiser le parcours client Omni-Canal.\n\n**Missions**\n- Piloter le plan média digital (Meta, Google Ads, TikTok, LinkedIn)\n- Optimiser la conversion sur le site institutionnel et les applications mobiles SG\n- Animer la communauté SG CI sur les réseaux sociaux (+ contenu sponsorisé)\n- Analyser les performances (GA4, HubSpot) et proposer des A/B tests\n- Coordonner les partenaires agences externes\n\n**Profil**\n- BAC+5 Marketing / École de commerce (ESSEC, ESCAE, INPHB, Groupe LOKO…)\n- 3 à 6 ans d'expérience en marketing digital idéalement dans un groupe bancaire ou retail\n- Maîtrise de : Facebook Business Manager, Google Ads, GA4, CRM (HubSpot, Salesforce)\n- Excellent relationnel, gestion de projets multi-acteurs\n- Très bonne aisance rédactionnelle en français\n\n**Rémunération** : 900 000 à 1 400 000 FCFA / mois + avantages bancaires employés (prêts préférentiels, etc.)`,
    apply_link: 'https://sg.ci/fr/carrieres/offre/chef-projet-marketing-digital',
    apply_email: null,
    source_url: 'https://www.linkedin.com/jobs/view/sg-ci-chef-projet-marketing',
    source_website: 'LinkedIn',
    status: 'published',
    seo_title: "Chef de Projet Marketing Digital - Société Générale CI",
    seo_description: "Recrutement Chef de Projet Marketing Digital à Abidjan Cocody par Société Générale CI.",
    seo_keywords: 'marketing digital, chef de projet, societe generale, abidjan, emploi',
    slug: 'chef-de-projet-marketing-digital-sg-ci',
    is_verified: 1,
    is_archived: 0,
    is_expired: 0,
  },
  {
    title: 'Stagiaire Data Analyst (Fin de cycle - Bac+4/5)',
    company: 'Ecobank Côte d\'Ivoire',
    location: 'Abidjan - Plateau',
    contract_type: 'Stage',
    description: `**Offre de stage 6 mois — Paiement : 250 000 FCFA / mois + tickets restaurant**\n\nEcobank Côte d'Ivoire propose un stage de fin d'études au sein de la **Business Intelligence & Data Team**, au siège du Plateau. Vous participerez concrètement à des projets Data au cœur des activités bancaires.\n\n**Rôle du/de la stagiaire**\n- Extraire, nettoyer et analyser les données transactionnelles des clients\n- Créer des tableaux de bord interactifs (Power BI / Tableau) pour les directions métiers\n- Automatiser des rapports réglementaires via SQL et Python\n- Contribuer à un projet de scoring crédit\n\n**Profil idéal**\n- Étudiant(e) en Bac+4/5 (Master 2, Cycle ingénieur, École de commerce)\n- Spécialisation : Informatique, Statistique, Data Science, Mathématiques appliquées\n- Bon niveau en SQL (PostgreSQL / Oracle) et Python (Pandas, NumPy)\n- Première expérience avec Power BI ou Tableau (projets école / perso)\n- Anglais technique lu. Français impeccable.\n\n**Modalités**\n- Début souhaité : Septembre 2026 (démarrage flexible de août à octobre)\n- Présence 5j/7 au siège Plateau (Abidjan)\n- Possibilité d'embauche en CDI à l'issue du stage pour les meilleurs éléments`,
    apply_link: null,
    apply_email: 'stages.data@ecobank.ci',
    source_url: 'https://career.ecobank.com/cotedivoire',
    source_website: 'Ecobank',
    status: 'pending',
    seo_title: "Stage Data Analyst - Ecobank Côte d'Ivoire",
    seo_description: "Stage de fin d'études Data Analyst chez Ecobank Côte d'Ivoire au Plateau Abidjan.",
    seo_keywords: 'stage, data analyst, ecobank, abidjan, sql, python',
    slug: 'stage-data-analyst-ecobank-ci',
    is_verified: 0,
    is_archived: 0,
    is_expired: 0,
  },
];

// -----------------------------------------------------------------------------
// 3. Exécution
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
    console.log(`   → ${SEED_JOBS.length} offres prêtes à être insérées.`);
    SEED_JOBS.forEach((j, i) =>
      console.log(`     ${String(i + 1).padStart(2, '0')}. [${j.contract_type}] ${j.title} · ${j.company}`)
    );
    return;
  }

  const db = new DatabaseSync(DB_PATH);

  try {
    if (!SEED_ONLY) {
      runMigration(db);
    } else {
      console.log('📦 Mode --seed-only : on saute la migration de schéma.');
    }
    const inserted = runSeed(db);
    runVerification(db, inserted);
  } finally {
    db.close();
    console.log(`\n✅ BDD prête : ${DB_PATH}`);
  }
}

// -----------------------------------------------------------------------------
// 4. Migration — Miroir 1:1 du schéma Supabase (sauf types)
// -----------------------------------------------------------------------------
function runMigration(db: DatabaseSync) {
  console.log('🏗  Création / mise à jour du schéma `job_offers`…');

  db.exec(`
    CREATE TABLE IF NOT EXISTS job_offers (
      id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
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
      CONSTRAINT valid_is_verified CHECK (
        is_verified IN (0,1)
      ),
      CONSTRAINT valid_is_archived CHECK (
        is_archived IN (0,1)
      ),
      CONSTRAINT valid_is_expired CHECK (
        is_expired IN (0,1)
      ),
      CONSTRAINT valid_apply_method CHECK (
        apply_link IS NOT NULL OR apply_email IS NOT NULL
      ),
      CONSTRAINT unique_title_company UNIQUE (title, company)
    );
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_location   ON job_offers (location);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_contract   ON job_offers (contract_type);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_status     ON job_offers (status);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON job_offers (created_at DESC);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_verified   ON job_offers (is_verified DESC, created_at DESC);`);

  // Suppression d'un éventuel trigger obsolète (évite la récursion infinie en SQLite)
  db.exec(`DROP TRIGGER IF EXISTS trigger_jobs_set_updated_at;`);

  console.log('   ✓ Schéma `job_offers` prêt.');
}

// -----------------------------------------------------------------------------
// 5. Seed des 3 offres — Idempotent via (title, company)
// -----------------------------------------------------------------------------
function runSeed(db: DatabaseSync): number {
  console.log(`🌱 Insertion de ${SEED_JOBS.length} offres de seed…`);

  const stmt = db.prepare(`
    INSERT INTO job_offers
      (title, company, location, contract_type, description, apply_link, apply_email, source_url, source_website, status, seo_title, seo_description, seo_keywords, slug, is_verified)
    VALUES ($title, $company, $location, $contract_type, $description, $apply_link, $apply_email, $source_url, $source_website, $status, $seo_title, $seo_description, $seo_keywords, $slug, $is_verified)
    ON CONFLICT(title, company) DO NOTHING;
  `);

  let inserted = 0;
  db.exec('BEGIN;');
  try {
    for (const j of SEED_JOBS) {
      const info = stmt.run({
        $title: j.title,
        $company: j.company,
        $location: j.location,
        $contract_type: j.contract_type,
        $description: j.description,
        $apply_link: j.apply_link,
        $apply_email: j.apply_email,
        $source_url: j.source_url,
        $source_website: j.source_website,
        $status: j.status,
        $seo_title: j.seo_title,
        $seo_description: j.seo_description,
        $seo_keywords: j.seo_keywords,
        $slug: j.slug,
        $is_verified: j.is_verified,
      });
      inserted += typeof info.changes === 'number' ? info.changes : 0;
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  console.log(`   ✓ ${inserted} / ${SEED_JOBS.length} offres insérées (autres déjà existantes).`);
  return inserted;
}

// -----------------------------------------------------------------------------
// 6. Vérification — affichage récapitulatif
// -----------------------------------------------------------------------------
function runVerification(db: DatabaseSync, inserted: number) {
  console.log('\n🔍 Vérification contenu BDD :');

  const count = db.prepare('SELECT COUNT(*) AS c FROM job_offers').get() as { c: number };
  console.log(`   → Total offres dans job_offers : ${count.c}`);

  const rows = db
    .prepare(
      `SELECT id, title, company, location, contract_type, status, is_verified, created_at
       FROM job_offers
       ORDER BY created_at DESC
       LIMIT 5;`
    )
    .all() as unknown as JobOfferRow[];

  rows.forEach((row, i) => {
    const badge = row.is_verified ? '✅ VERIFIED' : '⚪  ';
    const shortId = row.id.slice(0, 8) + '…';
    console.log(
      `   ${String(i + 1).padStart(2, '0')}. ${badge} [${row.contract_type.padEnd(11)}] status=${row.status.padEnd(10)} ${row.title.slice(0, 40).padEnd(40)} @ ${row.company} — ${row.location} (${shortId})`
    );
  });
}

main();
