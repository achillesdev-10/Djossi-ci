/**
 *  TravaillerEnCi — scripts/apply-all-migrations.ts
 *
 *  Applique TOUTES les migrations Supabase dans l'ordre, automatiquement :
 *    supabase/migrations/*.sql  (0001 → 0013)
 *
 *  Mécanisme :
 *    — table de suivi `public.schema_migrations` (nom du fichier + date) ;
 *    — une migration déjà enregistrée n'est pas rejouée (idempotent) ;
 *    — chaque migration est exécutée via la MANAGEMENT API (SQL direct, non
 *      dépendant du cache PostgREST), puis enregistrée ;
 *    — une migration qui échoue n'arrête pas les suivantes (rapport final).
 *
 *  Prérequis (.env.local) :
 *    - SUPABASE_ACCESS_TOKEN   (Personal Access Token : supabase.com/dashboard/account/tokens)
 *    - NEXT_PUBLIC_SUPABASE_URL
 *
 *  USAGE :
 *    npx tsx scripts/apply-all-migrations.ts            # applique tout
 *    npx tsx scripts/apply-all-migrations.ts --check    # vérifie seulement
 *
 *  Idempotent : relançable sans risque.
 */

import path from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

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

const CHECK_ONLY = process.argv.includes('--check');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL manquante (.env.local).');
  process.exit(1);
}
if (!ACCESS_TOKEN) {
  console.error(
    '❌ SUPABASE_ACCESS_TOKEN manquante.\n' +
      '   Créez un Personal Access Token sur https://supabase.com/dashboard/account/tokens\n' +
      '   puis ajoutez-le dans .env.local : SUPABASE_ACCESS_TOKEN=sbp_…',
  );
  process.exit(1);
}

const projectRef = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0];
const API = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function runSql(query: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      ok: false,
      error:
        (body && (body.message || body.error || body.details)) || `HTTP ${res.status}`,
    };
  }
  return { ok: true, data: body?.result ?? body };
}

/** Listes les fichiers de migration triés numériquement. */
function listMigrationFiles(): string[] {
  const dir = path.join(process.cwd(), 'supabase', 'migrations');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Vrai si l'erreur indique un objet déjà existant — cas des bases où la
 * migration avait été appliquée AVANT l'introduction de la table de suivi
 * (ex. la migration 0002 exécutée via APPLY-ALL-MIGRATIONS.sql).
 * Dans ce cas la migration est considérée comme déjà appliquée.
 */
function isAlreadyExistsError(error: string | undefined): boolean {
  if (!error) return false;
  // SQLSTATE PostgreSQL pour les objets déjà existants (cas d'une base où la
  // migration avait été appliquée AVANT l'introduction de la table de suivi) :
  //   42710  duplicate_object (type, policy…)
  //   42701  duplicate_column
  //   42P07  duplicate_table
  //   42723  duplicate_function
  //   42P16  duplicate_constraint
  // NB : 23505 (unique_violation) est volontairement EXCLU — un conflit de
  // données réel ne doit jamais être masqué comme « déjà appliquée ».
  return /42710|42701|42P07|42723|42P16/.test(error);
}

async function ensureTrackingTable(): Promise<boolean> {
  const res = await runSql(
    `CREATE TABLE IF NOT EXISTS public.schema_migrations (
       name       TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     );`,
  );
  return res.ok;
}

async function listApplied(): Promise<Set<string>> {
  const res = await runSql('SELECT name FROM public.schema_migrations');
  if (!res.ok || !Array.isArray(res.data)) return new Set();
  return new Set(res.data.map((row) => String((row as { name?: string }).name ?? '')));
}

async function main() {
  console.log(`🔎 Projet Supabase : ${projectRef}\n`);

  const files = listMigrationFiles();
  if (files.length === 0) {
    console.error('❌ Aucune migration trouvée dans supabase/migrations/.');
    process.exitCode = 1;
    return;
  }

  if (!(await ensureTrackingTable())) {
    console.error('❌ Impossible de créer la table de suivi schema_migrations.');
    process.exitCode = 1;
    return;
  }

  const applied = await listApplied();
  const todo = files.filter((f) => !applied.has(f));

  if (CHECK_ONLY) {
    console.log(
      todo.length === 0
        ? '✅ Toutes les migrations sont déjà appliquées.'
        : `ℹ️  Migrations non appliquées (${todo.length}) : ${todo.join(', ')}`,
    );
    return;
  }

  if (todo.length === 0) {
    console.log('✅ Toutes les migrations sont déjà appliquées. Rien à faire.');
    return;
  }

  let ok = 0;
  let failed = 0;

  for (const file of todo) {
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', file);
    const ddl = readFileSync(sqlPath, 'utf8');

    console.log(`⚙️  ${file}…`);
    const res = await runSql(ddl);
    if (!res.ok) {
      if (isAlreadyExistsError(res.error)) {
        // La migration avait déjà été appliquée (base pré-existante) : on
        // l'enregistre comme appliquée sans la rejouer au prochain run.
        const safeName = file.replace(/'/g, "''");
        await runSql(
          `INSERT INTO public.schema_migrations (name) VALUES ('${safeName}')
           ON CONFLICT (name) DO NOTHING`,
        );
        ok++;
        console.warn(`   ⚠️  Déjà appliquée (objet existant) — enregistrée : ${file}`);
        continue;
      }
      failed++;
      console.error(`   ❌ Échec : ${res.error}`);
      continue;
    }

    // Enregistrement du succès (nom de fichier contrôlé, échappé des quotes).
    const safeName = file.replace(/'/g, "''");
    const record = await runSql(
      `INSERT INTO public.schema_migrations (name) VALUES ('${safeName}')
       ON CONFLICT (name) DO NOTHING`,
    );
    if (!record.ok) {
      console.warn(`   ⚠️  Migration appliquée mais non enregistrée : ${record.error}`);
    }
    ok++;
    console.log(`   ✅ ${file} appliquée.`);
  }

  console.log(
    `\n${failed === 0 ? '✅' : '⚠️'} ${ok} migration(s) appliquée(s), ${failed} échec(s).` +
      (failed > 0 ? '\n   Consultez les erreurs ci-dessus et corrigez avant de relancer.' : ''),
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('❌ Erreur fatale :', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
