/**
 *  Djossi.ci — Service jobOffers (schéma SQL : job_offers)
 *  Chemin : src/services/jobOfferSchemaService.ts
 *
 *  Fournit une couche d'abstraction typée sur la BDD job_offers :
 *   • Local  : via `node:sqlite` (module natif Node 22+, fichier ./data/djossi-ci.sqlite3)
 *   → Pour Supabase : remplacer les implémentations ci-dessous par le SDK Supabase
 *     (`createClient` sur le serveur + requêtes SQL via `.from('job_offers')`)
 *     — toutes les signatures sont 1:1 compatibles (mêmes types JobOfferSchema / Filters).
 *
 *  Note: Le module `node:sqlite` étant expérimental, on charge DatabaseSync dynamiquement
 *  pour ne pas casser l'import côté Next.js SSR (qui ne sait pas toujours charger des addons natifs
 *  expérimentaux). Si indisponible → fallback sur le tableau SEED local (mode offline mock).
 */

import {
  JobContractType,
  JobOfferSchema,
  JobOfferSchemaFilters,
  JobOfferSchemaInsert,
  PaginatedRows,
} from '@/types';

// -----------------------------------------------------------------------------
// Données de fallback (mêmes 3 offres que le seed SQL pour les tests unitaires/SSR sans BDD)
// -----------------------------------------------------------------------------
const FALLBACK_OFFERS: JobOfferSchema[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Développeur Full Stack Senior (React / Node.js)',
    company: "MTN Côte d'Ivoire",
    location: 'Abidjan - Plateau',
    contract_type: 'CDI',
    description:
      "**À propos du poste**\n\nRejoignez l'équipe Digital & Tech de MTN Côte d'Ivoire…",
    apply_link: 'https://mtn.ci/recrutement/developpeur-fullstack',
    apply_email: 'recrutement.tech@mtn.ci',
    source_url: 'https://mtn.ci/recrutement',
    is_verified: true,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    title: 'Chef de Projet Marketing Digital',
    company: "Société Générale Côte d'Ivoire",
    location: 'Abidjan - Cocody Riviera',
    contract_type: 'CDI',
    description:
      "La Direction Marketing et Communication de Société Générale CI recherche un(e) Chef(fe) de Projet Marketing Digital…",
    apply_link: 'https://sg.ci/fr/carrieres/offre/chef-projet-marketing-digital',
    apply_email: null,
    source_url: 'https://www.linkedin.com/jobs/view/sg-ci-chef-projet-marketing',
    is_verified: true,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    title: 'Stagiaire Data Analyst (Fin de cycle - Bac+4/5)',
    company: "Ecobank Côte d'Ivoire",
    location: 'Abidjan - Plateau',
    contract_type: 'Stage',
    description:
      "**Offre de stage 6 mois — Paiement : 250 000 FCFA / mois**\n\nEcobank CI propose un stage au sein de la Business Intelligence & Data Team…",
    apply_link: null,
    apply_email: 'stages.data@ecobank.ci',
    source_url: 'https://career.ecobank.com/cotedivoire',
    is_verified: false,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

// -----------------------------------------------------------------------------
// Helpers : chargement paresseux du module natif + résolution du chemin BDD
// -----------------------------------------------------------------------------
type DatabaseSyncInstance = {
  prepare(sql: string): StatementInstance;
  exec(sql: string): void;
  close(): void;
};
type StatementInstance = {
  run(params?: unknown): { changes: number; lastInsertRowid: unknown };
  get(params?: unknown): JobOfferSchemaRow | undefined;
  all(params?: unknown): JobOfferSchemaRow[];
};
type JobOfferSchemaRow = Omit<JobOfferSchema, 'is_verified'> & { is_verified: 0 | 1 };

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
  activity: JobOffersActivityPoint[];
  latestOffers: JobOfferSchema[];
}

let cachedDb: DatabaseSyncInstance | null = null;
let cacheEnabled = true;
async function getDb(): Promise<DatabaseSyncInstance | null> {
  if (cachedDb && cacheEnabled) return cachedDb;
  try {
    const mod = await import('node:sqlite');
    const { DatabaseSync } = mod as unknown as { DatabaseSync: new (path: string) => DatabaseSyncInstance };
    // Lazy require to avoid bundling into Next.js client components
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath, mkdirSync, existsSync } = await import('node:module').then(() => ({
      fileURLToPath: (u: string) => {
        const p = require('url').fileURLToPath(u);
        return p;
      },
      mkdirSync: require('node:fs').mkdirSync,
      existsSync: require('node:fs').existsSync,
    }));
    const { mkdirSync: mkdir, existsSync: exists } = (await import('node:fs')) as typeof import('node:fs');
    const { resolve: resolvePath } = (await import('node:path')) as typeof import('node:path');
    const dataDir = resolvePath(process.cwd(), 'data');
    if (!exists(dataDir)) mkdir(dataDir, { recursive: true });
    const dbPath = resolvePath(dataDir, 'djossi-ci.sqlite3');
    cachedDb = new DatabaseSync(dbPath);
    ensureSchema(cachedDb);
    return cachedDb;
  } catch (err) {
    // Indisponibilité OK : mode fallback sans BDD (données mockées FALLBACK_OFFERS)
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
      is_verified     INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
      CONSTRAINT valid_contract_type CHECK (contract_type IN ('CDI','CDD','Stage','Prestation','Alternance','Freelance')),
      CONSTRAINT valid_is_verified CHECK (is_verified IN (0,1)),
      CONSTRAINT valid_apply_method CHECK (apply_link IS NOT NULL OR apply_email IS NOT NULL),
      CONSTRAINT unique_title_company UNIQUE (title, company)
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_location   ON job_offers (location);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_contract   ON job_offers (contract_type);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON job_offers (created_at DESC);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_verified   ON job_offers (is_verified DESC, created_at DESC);`);
}

function rowToSchema(row: JobOfferSchemaRow): JobOfferSchema {
  return { ...row, is_verified: row.is_verified === 1 };
}

function getDayKey(date: string | Date): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return value.toISOString().slice(0, 10);
}

function formatActivityLabel(dayKey: string): string {
  return new Date(`${dayKey}T00:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
}

// -----------------------------------------------------------------------------
// API publique du service
// -----------------------------------------------------------------------------

export class JobOfferSchemaService {
  // ------------ Lecture ----------------------------------------------------
  static async list(filters: JobOfferSchemaFilters = {}): Promise<PaginatedRows<JobOfferSchema>> {
    const db = await getDb();
    const {
      keyword,
      location,
      contract_type,
      is_verified,
      company,
      limit = 50,
      offset = 0,
      order_by = 'created_at',
      order_dir = 'desc',
    } = filters;

    if (!db) {
      return { rows: this.applyFiltersMemory(FALLBACK_OFFERS, filters), total: FALLBACK_OFFERS.length };
    }

    const clauses: string[] = [];
    const params: Record<string, unknown> = {};
    let idx = 1;

    if (keyword) {
      clauses.push('(title LIKE $kw OR company LIKE $kw OR description LIKE $kw)');
      params.$kw = `%${keyword}%`;
    }
    if (location) {
      clauses.push('location LIKE $loc');
      params.$loc = `%${location}%`;
    }
    if (contract_type) {
      const list = Array.isArray(contract_type) ? contract_type : [contract_type];
      const placeholders = list.map((t) => `$ct${idx++}`).join(',');
      list.forEach((t, i) => (params[`$ct${idx - list.length + i}`] = t));
      clauses.push(`contract_type IN (${placeholders})`);
    }
    if (typeof is_verified === 'boolean') {
      clauses.push(`is_verified = $iv`);
      params.$iv = is_verified ? 1 : 0;
    }
    if (company) {
      clauses.push('company LIKE $co');
      params.$co = `%${company}%`;
    }

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const orderSafe = ['created_at', 'title', 'company'].includes(order_by) ? order_by : 'created_at';
    const dirSafe = order_dir === 'asc' ? 'ASC' : 'DESC';

    const rowsStmt = db.prepare(`
      SELECT * FROM job_offers
      ${whereSql}
      ORDER BY ${orderSafe} ${dirSafe}
      LIMIT $limit OFFSET $offset;
    `);
    const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM job_offers ${whereSql};`);

    const rows = (rowsStmt.all({ ...params, $limit: limit, $offset: offset }) as JobOfferSchemaRow[]).map(rowToSchema);
    const total = ((countStmt.get(params) || { total: 0 }) as { total: number }).total;

    return { rows, total };
  }

  static async getById(id: string): Promise<JobOfferSchema | null> {
    const db = await getDb();
    if (!db) return FALLBACK_OFFERS.find((o) => o.id === id) || null;
    const row = db.prepare('SELECT * FROM job_offers WHERE id = $id').get({ $id: id }) as JobOfferSchemaRow | undefined;
    return row ? rowToSchema(row) : null;
  }

  static async getAdminStats(days: number = 7): Promise<JobOffersAdminStats> {
    const safeDays = Math.max(1, days);
    const dayKeys = Array.from({ length: safeDays }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (safeDays - index - 1));
      return getDayKey(date);
    });
    const todayKey = dayKeys[dayKeys.length - 1];
    const db = await getDb();

    if (!db) {
      const activityMap = new Map<string, { total: number; verified: number }>();
      dayKeys.forEach((dayKey) => {
        activityMap.set(dayKey, { total: 0, verified: 0 });
      });

      FALLBACK_OFFERS.forEach((offer) => {
        const dayKey = getDayKey(offer.created_at);
        const current = activityMap.get(dayKey);
        if (!current) return;
        current.total += 1;
        if (offer.is_verified) current.verified += 1;
      });

      const totalOffers = FALLBACK_OFFERS.length;
      const verifiedOffers = FALLBACK_OFFERS.filter((offer) => offer.is_verified).length;
      const offersToday = FALLBACK_OFFERS.filter((offer) => getDayKey(offer.created_at) === todayKey).length;

      return {
        totalOffers,
        verifiedOffers,
        offersToday,
        pendingReview: totalOffers - verifiedOffers,
        activity: dayKeys.map((dayKey) => {
          const point = activityMap.get(dayKey) || { total: 0, verified: 0 };
          return {
            date: dayKey,
            label: formatActivityLabel(dayKey),
            total: point.total,
            verified: point.verified,
          };
        }),
        latestOffers: [...FALLBACK_OFFERS]
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at), 'fr'))
          .slice(0, 5),
      };
    }

    const counts = db.prepare(`
      SELECT
        COUNT(*) AS totalOffers,
        SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) AS verifiedOffers,
        SUM(CASE WHEN substr(created_at, 1, 10) = $today THEN 1 ELSE 0 END) AS offersToday
      FROM job_offers;
    `).get({ $today: todayKey }) as
      | { totalOffers?: number; verifiedOffers?: number; offersToday?: number }
      | undefined;

    const activityRows = db.prepare(`
      SELECT
        substr(created_at, 1, 10) AS dayKey,
        COUNT(*) AS total,
        SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) AS verified
      FROM job_offers
      WHERE substr(created_at, 1, 10) >= $startDay
      GROUP BY substr(created_at, 1, 10)
      ORDER BY dayKey ASC;
    `).all({ $startDay: dayKeys[0] }) as Array<{
      dayKey: string;
      total: number;
      verified: number;
    }>;

    const activityMap = new Map(
      activityRows.map((row) => [
        row.dayKey,
        { total: Number(row.total || 0), verified: Number(row.verified || 0) },
      ])
    );

    const latestRows = db.prepare(`
      SELECT * FROM job_offers
      ORDER BY created_at DESC
      LIMIT 5;
    `).all() as JobOfferSchemaRow[];

    const totalOffers = Number(counts?.totalOffers || 0);
    const verifiedOffers = Number(counts?.verifiedOffers || 0);
    const offersToday = Number(counts?.offersToday || 0);

    return {
      totalOffers,
      verifiedOffers,
      offersToday,
      pendingReview: totalOffers - verifiedOffers,
      activity: dayKeys.map((dayKey) => {
        const point = activityMap.get(dayKey) || { total: 0, verified: 0 };
        return {
          date: dayKey,
          label: formatActivityLabel(dayKey),
          total: point.total,
          verified: point.verified,
        };
      }),
      latestOffers: latestRows.map(rowToSchema),
    };
  }

  // ------------ Écriture ---------------------------------------------------
  static async create(input: JobOfferSchemaInsert): Promise<JobOfferSchema> {
    if (!input.apply_link && !input.apply_email) {
      throw new Error("Une offre doit avoir au moins apply_link OU apply_email.");
    }
    const db = await getDb();
    const now = new Date().toISOString();
    if (!db) {
      const created: JobOfferSchema = {
        ...input,
        id: cryptoRandomUUID(),
        created_at: now,
        updated_at: now,
      };
      FALLBACK_OFFERS.unshift(created);
      return created;
    }
    const stmt = db.prepare(`
      INSERT INTO job_offers
        (title, company, location, contract_type, description, apply_link, apply_email, source_url, is_verified)
      VALUES ($title, $company, $location, $contract_type, $description, $apply_link, $apply_email, $source_url, $is_verified)
      RETURNING *;
    `);
    const row = stmt.get({
      $title: input.title,
      $company: input.company,
      $location: input.location,
      $contract_type: input.contract_type,
      $description: input.description,
      $apply_link: input.apply_link,
      $apply_email: input.apply_email,
      $source_url: input.source_url,
      $is_verified: input.is_verified ? 1 : 0,
    }) as JobOfferSchemaRow | undefined;
    if (!row) throw new Error('Insertion échouée.');
    return rowToSchema(row);
  }

  static async update(id: string, patch: Partial<JobOfferSchemaInsert>): Promise<JobOfferSchema | null> {
    const db = await getDb();
    if (!db) {
      const idx = FALLBACK_OFFERS.findIndex((o) => o.id === id);
      if (idx === -1) return null;
      FALLBACK_OFFERS[idx] = { ...FALLBACK_OFFERS[idx], ...patch, updated_at: new Date().toISOString() };
      return FALLBACK_OFFERS[idx];
    }
    const existing = await this.getById(id);
    if (!existing) return null;
    const merged: JobOfferSchemaInsert = {
      title: existing.title,
      company: existing.company,
      location: existing.location,
      contract_type: existing.contract_type as JobContractType,
      description: existing.description,
      apply_link: existing.apply_link,
      apply_email: existing.apply_email,
      source_url: existing.source_url,
      is_verified: existing.is_verified,
      ...patch,
    };
    db.prepare(`
      UPDATE job_offers SET
        title = $title, company = $company, location = $location,
        contract_type = $contract_type, description = $description,
        apply_link = $apply_link, apply_email = $apply_email,
        source_url = $source_url, is_verified = $is_verified
      WHERE id = $id;
    `).run({
      $id: id,
      $title: merged.title,
      $company: merged.company,
      $location: merged.location,
      $contract_type: merged.contract_type,
      $description: merged.description,
      $apply_link: merged.apply_link,
      $apply_email: merged.apply_email,
      $source_url: merged.source_url,
      $is_verified: merged.is_verified ? 1 : 0,
    });
    return this.getById(id);
  }

  static async remove(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      const before = FALLBACK_OFFERS.length;
      const kept = FALLBACK_OFFERS.filter((o) => o.id !== id);
      FALLBACK_OFFERS.splice(0, FALLBACK_OFFERS.length, ...kept);
      return FALLBACK_OFFERS.length < before;
    }
    const info = db.prepare('DELETE FROM job_offers WHERE id = $id').run({ $id: id });
    return typeof info.changes === 'number' ? info.changes > 0 : true;
  }

  // ------------ Helpers ----------------------------------------------------
  private static applyFiltersMemory(
    rows: JobOfferSchema[],
    f: JobOfferSchemaFilters
  ): JobOfferSchema[] {
    return rows
      .filter((r) => (f.keyword ?
        r.title.includes(f.keyword) || r.company.includes(f.keyword) || r.description.includes(f.keyword)
        : true))
      .filter((r) => (f.location ? r.location.includes(f.location) : true))
      .filter((r) => {
        if (!f.contract_type) return true;
        const arr = Array.isArray(f.contract_type) ? f.contract_type : [f.contract_type];
        return arr.includes(r.contract_type);
      })
      .filter((r) => (typeof f.is_verified === 'boolean' ? r.is_verified === f.is_verified : true))
      .filter((r) => (f.company ? r.company.includes(f.company) : true))
      .sort((a, b) => {
        const by = (f.order_by || 'created_at') as keyof JobOfferSchema;
        const dir = f.order_dir === 'asc' ? 1 : -1;
        const va = a[by]; const vb = b[by];
        if (va == null) return 1; if (vb == null) return -1;
        return String(va).localeCompare(String(vb), 'fr') * dir;
      })
      .slice(f.offset || 0, (f.offset || 0) + (f.limit || 50));
  }
}

// Petit polyfill UUID si crypto.randomUUID n'existe pas (très ancien Node)
function cryptoRandomUUID(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Évite que require/module manglent le bundler — on ne garde que l'export classe
export const __forTesting = { FALLBACK_OFFERS };
