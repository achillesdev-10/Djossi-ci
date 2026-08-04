/**
 *  Djossi.ci — Service jobOffers (schéma SQL : job_offers)
 *  Chemin : src/services/jobOfferSchemaService.ts
 *
 *  Fournit une couche d'abstraction typée sur la BDD job_offers :
 *   • Local  : via `node:sqlite` (module natif Node 22+, fichier ./data/djossi-ci.sqlite3)
 *   → Pour Supabase : remplacer les implémentations ci-dessous par le SDK Supabase
 *     (`createClient` sur le serveur + requêtes SQL via `.from('job_offers')`)
 *     — toutes les signatures sont 1:1 compatibles (mêmes types JobOfferSchema / Filters).
 */

import {
  JobContractType,
  JobOfferSchema,
  JobOfferSchemaFilters,
  JobOfferSchemaInsert,
  PaginatedRows,
  JobOfferSchemaStatus,
} from '@/types';

// -----------------------------------------------------------------------------
// Données de fallback
// -----------------------------------------------------------------------------
const FALLBACK_OFFERS: JobOfferSchema[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Développeur Full Stack Senior (React / Node.js)',
    company: "MTN Côte d'Ivoire",
    location: 'Abidjan - Plateau',
    contract_type: 'CDI',
    description: "**À propos du poste**\n\nRejoignez l'équipe Digital & Tech de MTN Côte d'Ivoire…",
    apply_link: 'https://mtn.ci/recrutement/developpeur-fullstack',
    apply_email: 'recrutement.tech@mtn.ci',
    source_url: 'https://mtn.ci/recrutement',
    source_website: 'MTN CI',
    status: 'published',
    seo_title: "Développeur Full Stack Senior - MTN Côte d'Ivoire",
    seo_description: "Offre d'emploi Développeur Full Stack Senior chez MTN Côte d'Ivoire à Abidjan.",
    seo_keywords: 'developpeur, fullstack, react, nodejs',
    slug: 'developpeur-fullstack-senior-mtn-ci',
    is_verified: true,
    is_archived: false,
    is_expired: false,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    title: 'Chef de Projet Marketing Digital',
    company: "Société Générale Côte d'Ivoire",
    location: 'Abidjan - Cocody Riviera',
    contract_type: 'CDI',
    description: "La Direction Marketing et Communication de Société Générale CI recherche un(e) Chef(fe) de Projet Marketing Digital…",
    apply_link: 'https://sg.ci/fr/carrieres/offre/chef-projet-marketing-digital',
    apply_email: null,
    source_url: 'https://www.linkedin.com/jobs/view/sg-ci-chef-projet-marketing',
    source_website: 'LinkedIn',
    status: 'published',
    seo_title: "Chef de Projet Marketing Digital - Société Générale CI",
    seo_description: "Recrutement Chef de Projet Marketing Digital à Abidjan Cocody par Société Générale CI.",
    seo_keywords: 'marketing digital, chef de projet, societe generale',
    slug: 'chef-de-projet-marketing-digital-sg-ci',
    is_verified: true,
    is_archived: false,
    is_expired: false,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    title: 'Stagiaire Data Analyst (Fin de cycle - Bac+4/5)',
    company: "Ecobank Côte d'Ivoire",
    location: 'Abidjan - Plateau',
    contract_type: 'Stage',
    description: "**Offre de stage 6 mois — Paiement : 250 000 FCFA / mois**\n\nEcobank CI propose un stage au sein de la Business Intelligence & Data Team…",
    apply_link: null,
    apply_email: 'stages.data@ecobank.ci',
    source_url: 'https://career.ecobank.com/cotedivoire',
    source_website: 'Ecobank',
    status: 'pending',
    seo_title: "Stage Data Analyst - Ecobank Côte d'Ivoire",
    seo_description: "Stage de fin d'études Data Analyst chez Ecobank Côte d'Ivoire au Plateau Abidjan.",
    seo_keywords: 'stage, data analyst, ecobank, abidjan',
    slug: 'stage-data-analyst-ecobank-ci',
    is_verified: false,
    is_archived: false,
    is_expired: false,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

type DatabaseSyncInstance = {
  prepare(sql: string): StatementInstance;
  exec(sql: string): void;
  close(): void;
};
type StatementInstance = {
  run(params?: unknown): { changes: number; lastInsertRowid: unknown };
  get(params?: unknown): any | undefined;
  all(params?: unknown): any[];
};

export interface JobOffersActivityPoint {
  date: string;
  label: string;
  total: number;
  verified: number;
}

export interface JobOffersAdminStats {
  totalOffers: number;
  verifiedOffers: number;
  offersToday: number;
  pendingReview: number;
  activeOffers: number;
  newThisWeek: number;
  totalClicks: number;
  activity: JobOffersActivityPoint[];
  latestOffers: JobOfferSchema[];
  scraperHealth?: ScraperLog;
}

export interface ScraperLog {
  id: number;
  status: 'success' | 'error' | 'running';
  offers_added: number;
  message: string;
  started_at: string;
  finished_at: string | null;
}

let cachedDb: DatabaseSyncInstance | null = null;
async function getDb(): Promise<DatabaseSyncInstance | null> {
  if (cachedDb) return cachedDb;
  try {
    const mod = await import('node:sqlite');
    const { DatabaseSync } = mod as unknown as { DatabaseSync: new (path: string) => DatabaseSyncInstance };
    const { resolve: resolvePath } = (await import('node:path')) as typeof import('node:path');
    const { existsSync: exists, mkdirSync: mkdir } = (await import('node:fs')) as typeof import('node:fs');
    const dataDir = resolvePath(process.cwd(), 'data');
    if (!exists(dataDir)) mkdir(dataDir, { recursive: true });
    const dbPath = resolvePath(dataDir, 'djossi-ci.sqlite3');
    cachedDb = new DatabaseSync(dbPath);
    ensureSchema(cachedDb);
    return cachedDb;
  } catch (err) {
    return null;
  }
}

function ensureSchema(db: DatabaseSyncInstance) {
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
      CONSTRAINT valid_contract_type CHECK (contract_type IN ('CDI','CDD','Stage','Prestation','Alternance','Freelance')),
      CONSTRAINT valid_status CHECK (status IN ('pending','published','rejected','archived')),
      CONSTRAINT valid_is_verified CHECK (is_verified IN (0,1)),
      CONSTRAINT valid_is_archived CHECK (is_archived IN (0,1)),
      CONSTRAINT valid_is_expired CHECK (is_expired IN (0,1)),
      CONSTRAINT valid_apply_method CHECK (apply_link IS NOT NULL OR apply_email IS NOT NULL),
      CONSTRAINT unique_title_company UNIQUE (title, company)
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_location   ON job_offers (location);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_contract   ON job_offers (contract_type);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_status     ON job_offers (status);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON job_offers (created_at DESC);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_verified   ON job_offers (is_verified DESC, created_at DESC);`);

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

  // Migration défensive : la table peut avoir été créée avant l'ajout de
  // `clicks_count` (ex: scripts/sqlite-setup.ts). On l'ajoute si absente.
  const cols = db.prepare('PRAGMA table_info(job_offers)').all() as Array<{ name: string }>;
  const existingColumns = new Set(cols.map((c) => String(c.name)));
  if (!existingColumns.has('clicks_count')) {
    db.exec('ALTER TABLE job_offers ADD COLUMN clicks_count INTEGER NOT NULL DEFAULT 0');
  }
}

function rowToSchema(row: any): JobOfferSchema {
  return {
    ...row,
    status: row.status || 'pending',
    is_verified: row.is_verified === 1,
    is_archived: row.is_archived === 1,
    is_expired: row.is_expired === 1,
  };
}

function getDayKey(date: string | Date): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return value.toISOString().slice(0, 10);
}

function formatActivityLabel(dayKey: string): string {
  return new Date(`${dayKey}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export class JobOfferSchemaService {
  static async list(filters: JobOfferSchemaFilters = {}): Promise<PaginatedRows<JobOfferSchema>> {
    const db = await getDb();
    const { keyword, location, contract_type, status, is_verified, is_archived, is_expired, company, limit = 50, offset = 0, order_by = 'created_at', order_dir = 'desc' } = filters;
    if (!db) return { rows: [], total: 0 };
    const clauses: string[] = [];
    const params: Record<string, unknown> = {};
    if (keyword) { clauses.push('(title LIKE $kw OR company LIKE $kw OR description LIKE $kw)'); params.$kw = `%${keyword}%`; }
    if (location) { clauses.push('location LIKE $loc'); params.$loc = `%${location}%`; }
    if (contract_type) {
      const list = Array.isArray(contract_type) ? contract_type : [contract_type];
      const placeholders = list.map((_, i) => `$ct${i}`).join(',');
      list.forEach((t, i) => params[`$ct${i}`] = t);
      clauses.push(`contract_type IN (${placeholders})`);
    }
    if (status) {
      const list = Array.isArray(status) ? status : [status];
      const placeholders = list.map((_, i) => `$st${i}`).join(',');
      list.forEach((t, i) => params[`$st${i}`] = t);
      clauses.push(`status IN (${placeholders})`);
    }
    if (typeof is_verified === 'boolean') { clauses.push(`is_verified = $iv`); params.$iv = is_verified ? 1 : 0; }
    if (typeof is_archived === 'boolean') { clauses.push(`is_archived = $ia`); params.$ia = is_archived ? 1 : 0; }
    if (typeof is_expired === 'boolean') { clauses.push(`is_expired = $ie`); params.$ie = is_expired ? 1 : 0; }
    if (company) { clauses.push('company LIKE $co'); params.$co = `%${company}%`; }
    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const orderSafe = ['created_at', 'title', 'company'].includes(order_by!) ? order_by : 'created_at';
    const dirSafe = order_dir === 'asc' ? 'ASC' : 'DESC';
    const rows = db.prepare(`SELECT * FROM job_offers ${whereSql} ORDER BY ${orderSafe} ${dirSafe} LIMIT $limit OFFSET $offset`).all({ ...params, $limit: limit, $offset: offset }).map(rowToSchema);
    const total = (db.prepare(`SELECT COUNT(*) AS total FROM job_offers ${whereSql}`).get(params) as any).total;
    return { rows, total };
  }

  static async getById(id: string): Promise<JobOfferSchema | null> {
    const db = await getDb();
    if (!db) return null;
    const row = db.prepare('SELECT * FROM job_offers WHERE id = $id').get({ $id: id });
    return row ? rowToSchema(row) : null;
  }

  static async getAdminStats(days: number = 7): Promise<JobOffersAdminStats> {
    const db = await getDb();
    if (!db) return { totalOffers: 0, verifiedOffers: 0, offersToday: 0, pendingReview: 0, activeOffers: 0, newThisWeek: 0, totalClicks: 0, activity: [], latestOffers: [] };
    const dayKeys = Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (days - i - 1));
      return getDayKey(d);
    });
    const counts = db.prepare(`
      SELECT
        COUNT(*) AS totalOffers,
        SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) AS verifiedOffers,
        SUM(CASE WHEN substr(created_at, 1, 10) = $today THEN 1 ELSE 0 END) AS offersToday,
        SUM(CASE WHEN is_archived = 0 AND is_expired = 0 THEN 1 ELSE 0 END) AS activeOffers,
        SUM(CASE WHEN created_at >= $weekAgo THEN 1 ELSE 0 END) AS newThisWeek,
        SUM(clicks_count) AS totalClicks
      FROM job_offers;
    `).get({ $today: dayKeys[days-1], $weekAgo: new Date(Date.now() - 7 * 86400000).toISOString() }) as any;

    const activityRows = db.prepare(`
      SELECT substr(created_at, 1, 10) AS dayKey, COUNT(*) AS total, SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) AS verified
      FROM job_offers WHERE substr(created_at, 1, 10) >= $startDay GROUP BY dayKey ORDER BY dayKey ASC
    `).all({ $startDay: dayKeys[0] });

    const scraperLog = db.prepare(`SELECT * FROM scraper_logs ORDER BY started_at DESC LIMIT 1`).get() as ScraperLog | undefined;

    return {
      totalOffers: counts.totalOffers || 0,
      verifiedOffers: counts.verifiedOffers || 0,
      offersToday: counts.offersToday || 0,
      activeOffers: counts.activeOffers || 0,
      newThisWeek: counts.newThisWeek || 0,
      totalClicks: counts.totalClicks || 0,
      pendingReview: (counts.totalOffers || 0) - (counts.verifiedOffers || 0),
      activity: dayKeys.map(k => {
        const r = activityRows.find(ar => ar.dayKey === k) || { total: 0, verified: 0 };
        return { date: k, label: formatActivityLabel(k), total: r.total, verified: r.verified };
      }),
      latestOffers: db.prepare(`SELECT * FROM job_offers ORDER BY created_at DESC LIMIT 5`).all().map(rowToSchema),
      scraperHealth: scraperLog
    };
  }

  /** Colonnes autorisées pour les mises à jour (protection contre les injections SQL). */
  private static readonly UPDATE_COLUMNS = new Set([
    'title',
    'company',
    'location',
    'contract_type',
    'description',
    'apply_link',
    'apply_email',
    'source_url',
    'source_website',
    'status',
    'seo_title',
    'seo_description',
    'seo_keywords',
    'slug',
    'is_verified',
    'is_archived',
    'is_expired',
  ]);

  static async update(id: string, patch: Partial<JobOfferSchemaInsert>): Promise<JobOfferSchema | null> {
    const db = await getDb();
    if (!db) return null;
    const existing = await this.getById(id);
    if (!existing) return null;

    // 1. Ne retenir que les colonnes connues et converties (bool → 0/1).
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (!JobOfferSchemaService.UPDATE_COLUMNS.has(key)) continue;
      clean[key] = typeof value === 'boolean' ? (value ? 1 : 0) : value;
    }

    // 2. Garantir la contrainte `valid_apply_method` : une offre doit toujours
    //    proposer apply_link OU apply_email (fallback uniquement si les deux
    //    restent vides après l'application du patch).
    const finalApplyLink =
      clean.apply_link !== undefined ? clean.apply_link : existing.apply_link;
    const finalApplyEmail =
      clean.apply_email !== undefined ? clean.apply_email : existing.apply_email;
    if (!finalApplyLink && !finalApplyEmail) {
      clean.apply_email = 'contact@travaillerenci.ci';
    }

    // 3. Patch vide → aucune requête (évite un UPDATE SQL invalide).
    if (Object.keys(clean).length === 0) {
      return existing;
    }

    const fields = Object.keys(clean).map((k) => `${k} = $${k}`).join(', ');
    const params: Record<string, unknown> = { $id: id };
    Object.entries(clean).forEach(([k, v]) => (params[`$${k}`] = v));
    db.prepare(`UPDATE job_offers SET ${fields} WHERE id = $id`).run(params);
    return this.getById(id);
  }

  static async remove(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;
    return (db.prepare('DELETE FROM job_offers WHERE id = $id').run({ $id: id }).changes || 0) > 0;
  }

  static async addScraperLog(status: 'success' | 'error' | 'running', offers_added: number, message: string): Promise<number> {
    const db = await getDb();
    if (!db) return 0;
    const stmt = db.prepare(`INSERT INTO scraper_logs (status, offers_added, message) VALUES ($status, $offers_added, $message) RETURNING id`);
    const res = stmt.get({ $status: status, $offers_added: offers_added, $message: message }) as any;
    return res?.id || 0;
  }

  static async finishScraperLog(id: number, status: 'success' | 'error', offers_added: number, message: string) {
    const db = await getDb();
    if (!db) return;
    db.prepare(`UPDATE scraper_logs SET status = $status, offers_added = $offers_added, message = $message, finished_at = datetime('now') WHERE id = $id`).run({ $id: id, $status: status, $offers_added: offers_added, $message: message });
  }
}
export const __forTesting = { FALLBACK_OFFERS };
