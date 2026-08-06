/**
 *  TravaillerenCi — Service Blog (schéma SQL : blog_posts)
 *  Chemin : src/services/blogService.ts
 *
 *  Couche d'abstraction typée sur la table `blog_posts` :
 *   • Local : via `node:sqlite` (module natif Node 22+, fichier ./data/travaillerenci.sqlite3)
 *   • Prod  : via le SDK Supabase (mêmes signatures, mêmes types BlogPost).
 */

import type {
  BlogPost,
  BlogPostFilters,
  BlogPostInsert,
  BlogPostStatus,
} from '@/types/blog';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { slugify } from '@/lib/slugify';

// -----------------------------------------------------------------------------
// Types SQLite (module natif — mêmes formes que dans jobOfferSchemaService)
// -----------------------------------------------------------------------------
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

const DEFAULT_AUTHOR = 'TravaillerenCi';

let cachedDb: DatabaseSyncInstance | null = null;
async function getDb(): Promise<DatabaseSyncInstance | null> {
  if (cachedDb) return cachedDb;
  try {
    const mod = await import('node:sqlite');
    const { DatabaseSync } = mod as unknown as {
      DatabaseSync: new (path: string) => DatabaseSyncInstance;
    };
    const { resolve: resolvePath } = (await import('node:path')) as typeof import('node:path');
    const { existsSync: exists, mkdirSync: mkdir } = (await import('node:fs')) as typeof import('node:fs');
    const dataDir = resolvePath(process.cwd(), 'data');
    if (!exists(dataDir)) mkdir(dataDir, { recursive: true });
    const dbPath = resolvePath(dataDir, 'travaillerenci.sqlite3');
    cachedDb = new DatabaseSync(dbPath);
    ensureSchema(cachedDb);
    return cachedDb;
  } catch (err) {
    console.error('[blogService] SQLite indisponible :', err);
    return null;
  }
}

function ensureSchema(db: DatabaseSyncInstance) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      title        TEXT NOT NULL,
      slug         TEXT NOT NULL UNIQUE,
      excerpt      TEXT,
      content      TEXT NOT NULL,
      cover_image  TEXT,
      author       TEXT NOT NULL DEFAULT '${DEFAULT_AUTHOR}',
      tags         TEXT,
      status       TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
      CONSTRAINT valid_blog_status CHECK (status IN ('draft','published','archived'))
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_blog_status_published ON blog_posts (status, published_at DESC);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts (slug);`);

  seedDefaultPosts(db);
}

/** Premiers articles d'accueil (insérés une seule fois, uniquement si absents). */
function seedDefaultPosts(db: DatabaseSyncInstance) {
  const posts: Array<{
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    author: string;
    tags: string;
    published_at: string;
  }> = [
    {
      slug: 'bienvenue-sur-le-blog-travaillerenci',
      title: 'Bienvenue sur le blog TravaillerenCi',
      excerpt:
        "Découvrez les coulisses de la plateforme et tout ce que vous devez savoir pour trouver un emploi en Côte d'Ivoire.",
      content:
        "## Bienvenue !\n\n**TravaillerenCi** est la plateforme ivoirienne qui centralise les offres d'emploi, de stages, de bourses et de concours administratifs.\n\nSur ce blog, nous partagerons régulièrement :\n\n- Des conseils pour réussir vos candidatures\n- Les tendances du marché du travail en Côte d'Ivoire\n- Les actualités de la plateforme et les nouvelles fonctionnalités\n- Des témoignages de candidats et de recruteurs\n\n## Comment utiliser la plateforme ?\n\n- **Parcourez** les offres vérifiées sur la page d'accueil\n- **Filtrez** par ville, secteur ou type de contrat\n- **Postulez** en un clic via le lien ou l'email de l'annonce\n- **Créez votre CV** professionnel avec le générateur assisté par IA\n\nBon courage dans vos recherches, et à très vite ! 🇨🇮",
      author: 'AchillesDev10',
      tags: 'plateforme, actualites, bienvenue',
      published_at: new Date().toISOString(),
    },
    {
      slug: 'conseils-candidature-cote-divoire',
      title: "5 conseils pour réussir sa candidature en Côte d'Ivoire",
      excerpt:
        'CV, lettre de motivation, entretien : les bons réflexes pour vous démarquer auprès des recruteurs ivoiriens.',
      content:
        "## Votre candidature mérite mieux qu'un envoi en masse\n\nVoici les conseils que nous donnons le plus souvent aux candidats :\n\n## 1. Adaptez votre CV à chaque offre\n\nUn CV générique est repéré en quelques secondes. Reprenez les **mots-clés de l'annonce** (intitulé du poste, compétences demandées) et mettez en avant vos expériences les plus pertinentes.\n\n## 2. Soignez votre lettre de motivation\n\nAdressez-vous à l'entreprise par son nom, citez une réalisation concrète et expliquez **pourquoi vous** plutôt qu'un autre.\n\n## 3. Vérifiez vos coordonnées\n\nUne simple faute dans votre email ou votre numéro peut vous coûter un entretien. Relisez tout avant d'envoyer.\n\n## 4. Préparez vos références\n\nLes recruteurs ivoiriens apprécient les recommandations vérifiables : prévoyez deux ou trois personnes prêtes à parler de vous.\n\n## 5. Relancez poliment\n\nUne relance courtoise **7 à 10 jours** après l'envoi montre votre motivation et vous démarque des autres candidats.\n\nBon courage, et n'oubliez pas : le générateur de CV de TravaillerenCi est là pour vous aider ! ✨",
      author: 'AchillesDev10',
      tags: 'conseils, cv, candidature',
      published_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ];

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO blog_posts (title, slug, excerpt, content, cover_image, author, tags, status, published_at, created_at, updated_at)
     VALUES ($title, $slug, $excerpt, $content, NULL, $author, $tags, 'published', $published_at, $published_at, $published_at)`
  );
  for (const p of posts) {
    stmt.run({
      $title: p.title,
      $slug: p.slug,
      $excerpt: p.excerpt,
      $content: p.content,
      $author: p.author,
      $tags: p.tags,
      $published_at: p.published_at,
    });
  }
}

function rowToPost(row: any): BlogPost {
  return {
    ...row,
    excerpt: row.excerpt ?? null,
    cover_image: row.cover_image ?? null,
    tags: row.tags ?? null,
    published_at: row.published_at ?? null,
    status: row.status || 'draft',
  };
}

function normalizePostFromSupabase(row: any): BlogPost {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    slug: String(row.slug || ''),
    excerpt: row.excerpt ?? null,
    content: String(row.content || ''),
    cover_image: row.cover_image ?? null,
    author: String(row.author || DEFAULT_AUTHOR),
    tags: row.tags ?? null,
    status: (['draft', 'published', 'archived'].includes(row.status) ? row.status : 'draft') as BlogPostStatus,
    published_at: row.published_at ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  };
}

/** Colonnes autorisées pour les mises à jour (protection contre les injections SQL). */
const UPDATE_COLUMNS = new Set([
  'title',
  'slug',
  'excerpt',
  'content',
  'cover_image',
  'author',
  'tags',
  'status',
  'published_at',
]);

function buildFiltersSql(filters: BlogPostFilters) {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (filters.status) {
    const list = Array.isArray(filters.status) ? filters.status : [filters.status];
    const placeholders = list.map((_, i) => `$st${i}`).join(',');
    list.forEach((t, i) => (params[`$st${i}`] = t));
    clauses.push(`status IN (${placeholders})`);
  }
  if (filters.keyword) {
    clauses.push('(title LIKE $kw OR excerpt LIKE $kw OR content LIKE $kw OR tags LIKE $kw)');
    params.$kw = `%${filters.keyword}%`;
  }
  return { whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export class BlogService {
  static async list(filters: BlogPostFilters = {}): Promise<{ rows: BlogPost[]; total: number }> {
    if (isSupabaseConfigured()) return this.listSupabase(filters);

    const db = await getDb();
    if (!db) return { rows: [], total: 0 };

    const { whereSql, params } = buildFiltersSql(filters);
    const orderBy = (['created_at', 'published_at', 'title'] as const).includes(
      (filters.order_by || 'created_at') as 'created_at' | 'published_at' | 'title'
    )
      ? filters.order_by!
      : 'created_at';
    const dir = filters.order_dir === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(Math.max(filters.limit || 50, 1), 200);
    const offset = Math.max(filters.offset || 0, 0);

    const rows = db
      .prepare(
        `SELECT * FROM blog_posts ${whereSql} ORDER BY ${orderBy} ${dir} LIMIT $limit OFFSET $offset`
      )
      .all({ ...params, $limit: limit, $offset: offset })
      .map(rowToPost);
    const total = (
      db.prepare(`SELECT COUNT(*) AS total FROM blog_posts ${whereSql}`).get(params) as any
    ).total;
    return { rows, total };
  }

  static async getById(id: string): Promise<BlogPost | null> {
    if (isSupabaseConfigured()) return this.getByIdSupabase(id);
    const db = await getDb();
    if (!db) return null;
    const row = db.prepare('SELECT * FROM blog_posts WHERE id = $id').get({ $id: id });
    return row ? rowToPost(row) : null;
  }

  static async getBySlug(slug: string): Promise<BlogPost | null> {
    if (isSupabaseConfigured()) return this.getBySlugSupabase(slug);
    const db = await getDb();
    if (!db) return null;
    const row = db.prepare('SELECT * FROM blog_posts WHERE slug = $slug').get({ $slug: slug });
    return row ? rowToPost(row) : null;
  }

  /** Slug unique : si le slug demandé est pris, on suffixe -2, -3… (exclut l'id donné en édition). */
  static async ensureUniqueSlug(slug: string, excludeId?: string): Promise<string> {
    const base = slugify(slug) || 'article';
    let candidate = base;
    let i = 2;
    while (await this.slugExists(candidate, excludeId)) {
      candidate = `${base}-${i++}`;
    }
    return candidate;
  }

  private static async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return false;
      let query = supabase.from('blog_posts').select('id').eq('slug', slug);
      if (excludeId) query = query.neq('id', excludeId);
      const { data } = await query.limit(1);
      return Boolean(data && data.length > 0);
    }
    const db = await getDb();
    if (!db) return false;
    const row = db
      .prepare(
        excludeId
          ? 'SELECT id FROM blog_posts WHERE slug = $slug AND id != $id LIMIT 1'
          : 'SELECT id FROM blog_posts WHERE slug = $slug LIMIT 1'
      )
      .get(excludeId ? { $slug: slug, $id: excludeId } : { $slug: slug });
    return Boolean(row);
  }

  static async create(data: Partial<BlogPostInsert>): Promise<BlogPost | null> {
    if (isSupabaseConfigured()) return this.createSupabase(data);

    const db = await getDb();
    if (!db) return null;

    const title = String(data.title || '').trim();
    if (!title) return null;

    const status = (['draft', 'published', 'archived'].includes(data.status as string)
      ? data.status
      : 'draft') as BlogPostStatus;
    const now = new Date().toISOString();
    const slug = await this.ensureUniqueSlug(data.slug || title);

    const res = db
      .prepare(
        `INSERT INTO blog_posts (title, slug, excerpt, content, cover_image, author, tags, status, published_at, created_at, updated_at)
         VALUES ($title, $slug, $excerpt, $content, $cover_image, $author, $tags, $status, $published_at, datetime('now'), datetime('now'))
         RETURNING id`
      )
      .get({
        $title: title,
        $slug: slug,
        $excerpt: data.excerpt ? String(data.excerpt).trim() || null : null,
        $content: String(data.content || '').trim(),
        $cover_image: data.cover_image ? String(data.cover_image).trim() || null : null,
        $author: String(data.author || DEFAULT_AUTHOR).trim() || DEFAULT_AUTHOR,
        $tags: data.tags ? String(data.tags).trim() || null : null,
        $status: status,
        $published_at:
          status === 'published' && data.published_at
            ? String(data.published_at).trim() || now
            : status === 'published'
            ? now
            : data.published_at
            ? String(data.published_at).trim() || null
            : null,
      }) as any;

    return res?.id ? this.getById(res.id) : null;
  }

  static async update(id: string, patch: Partial<BlogPostInsert>): Promise<BlogPost | null> {
    if (isSupabaseConfigured()) return this.updateSupabase(id, patch);

    const db = await getDb();
    if (!db) return null;
    const existing = await this.getById(id);
    if (!existing) return null;

    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (!UPDATE_COLUMNS.has(key)) continue;
      if (typeof value === 'string') {
        clean[key] = value.trim();
      } else if (value === null) {
        clean[key] = null;
      }
    }

    if (typeof clean.slug === 'string' && clean.slug.trim()) {
      clean.slug = await this.ensureUniqueSlug(clean.slug, id);
    } else {
      // Slug vide → on conserve le slug existant.
      delete clean.slug;
    }

    // Publication sans date : on horodate automatiquement (l'ordre du blog
    // public dépend de published_at).
    if (clean.status === 'published' && !existing.published_at) {
      clean.published_at = new Date().toISOString();
    }

    if (Object.keys(clean).length === 0) return existing;

    const fields = Object.keys(clean).map((k) => `${k} = $${k}`).join(', ');
    const params: Record<string, unknown> = { $id: id };
    Object.entries(clean).forEach(([k, v]) => (params[`$${k}`] = v));
    db.prepare(`UPDATE blog_posts SET ${fields}, updated_at = datetime('now') WHERE id = $id`).run(params);
    return this.getById(id);
  }

  static async remove(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) return this.removeSupabase(id);
    const db = await getDb();
    if (!db) return false;
    return (db.prepare('DELETE FROM blog_posts WHERE id = $id').run({ $id: id }).changes || 0) > 0;
  }

  // ===========================================================================
  //  Implémentations Supabase (production)
  // ===========================================================================

  private static async listSupabase(filters: BlogPostFilters): Promise<{ rows: BlogPost[]; total: number }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { rows: [], total: 0 };

    let query = supabase.from('blog_posts').select('*', { count: 'exact' });
    if (filters.status) {
      const list = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (list.length > 0) query = query.in('status', list);
    }
    if (filters.keyword) {
      const safeKeyword = String(filters.keyword).replace(/[,.( )*!]/g, ' ').trim();
      if (safeKeyword) {
        const pattern = `%${safeKeyword}%`;
        query = query.or(`title.ilike.${pattern},excerpt.ilike.${pattern},content.ilike.${pattern},tags.ilike.${pattern}`);
      }
    }
    const orderBy = (['created_at', 'published_at', 'title'] as const).includes(
      (filters.order_by || 'created_at') as 'created_at' | 'published_at' | 'title'
    )
      ? filters.order_by!
      : 'created_at';
    query = query.order(orderBy, { ascending: filters.order_dir === 'asc' });
    const safeLimit = Math.min(Math.max(filters.limit || 50, 1), 200);
    query = query.range(filters.offset || 0, (filters.offset || 0) + safeLimit - 1);

    const { data, count, error } = await query;
    if (error) {
      console.error('listSupabase (blog) error:', error.message);
      return { rows: [], total: 0 };
    }
    return { rows: (data || []).map(normalizePostFromSupabase), total: count || 0 };
  }

  private static async getByIdSupabase(id: string): Promise<BlogPost | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return normalizePostFromSupabase(data);
  }

  private static async getBySlugSupabase(slug: string): Promise<BlogPost | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error || !data) return null;
    return normalizePostFromSupabase(data);
  }

  private static async createSupabase(data: Partial<BlogPostInsert>): Promise<BlogPost | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const title = String(data.title || '').trim();
    if (!title) return null;

    const status = (['draft', 'published', 'archived'].includes(data.status as string)
      ? data.status
      : 'draft') as BlogPostStatus;
    const now = new Date().toISOString();
    const slug = await this.ensureUniqueSlug(data.slug || title);

    const payload = {
      title,
      slug,
      excerpt: data.excerpt ? String(data.excerpt).trim() || null : null,
      content: String(data.content || '').trim(),
      cover_image: data.cover_image ? String(data.cover_image).trim() || null : null,
      author: String(data.author || DEFAULT_AUTHOR).trim() || DEFAULT_AUTHOR,
      tags: data.tags ? String(data.tags).trim() || null : null,
      status,
      published_at:
        status === 'published' && data.published_at
          ? String(data.published_at).trim() || now
          : status === 'published'
          ? now
          : data.published_at
          ? String(data.published_at).trim() || null
          : null,
    };

    const { data: created, error } = await supabase
      .from('blog_posts')
      .insert(payload)
      .select()
      .maybeSingle();
    if (error || !created) {
      console.error('createSupabase (blog) error:', error?.message);
      return null;
    }
    return normalizePostFromSupabase(created);
  }

  private static async updateSupabase(id: string, patch: Partial<BlogPostInsert>): Promise<BlogPost | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const existing = await this.getByIdSupabase(id);
    if (!existing) return null;

    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (!UPDATE_COLUMNS.has(key)) continue;
      clean[key] = typeof value === 'string' ? value.trim() : value;
    }
    if (typeof clean.slug === 'string' && clean.slug.trim()) {
      clean.slug = await this.ensureUniqueSlug(clean.slug, id);
    } else {
      // Slug vide → on conserve le slug existant.
      delete clean.slug;
    }

    // Publication sans date : on horodate automatiquement.
    if (clean.status === 'published' && !existing.published_at) {
      clean.published_at = new Date().toISOString();
    }

    if (Object.keys(clean).length === 0) return existing;

    const { data, error } = await supabase
      .from('blog_posts')
      .update({ ...clean, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error || !data) {
      console.error('updateSupabase (blog) error:', error?.message);
      return null;
    }
    return normalizePostFromSupabase(data);
  }

  private static async removeSupabase(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    const { data, error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)
      .select('id');
    return !error && Array.isArray(data) && data.length > 0;
  }
}
