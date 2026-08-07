/**
 *  TravaillerEnCi — scripts/apply-exams-migration.ts
 *
 *  Applique la migration de la table `exams` sur Supabase via la
 *  MANAGEMENT API (exécution SQL directe — ne dépend PAS du cache de schéma
 *  PostgREST, qui peut être en cause quand la table « n'apparaît pas »).
 *
 *  Prérequis :
 *    - Un Personal Access Token Supabase : https://supabase.com/dashboard/account/tokens
 *      → à placer dans .env.local sous la clé SUPABASE_ACCESS_TOKEN (ou en
 *        variable d'environnement du shell).
 *    - NEXT_PUBLIC_SUPABASE_URL (déjà présente dans .env.local) — la ref du
 *      projet est extraite de l'URL.
 *
 *  USAGE :
 *    npx tsx scripts/apply-exams-migration.ts           # vérifie puis applique
 *    npx tsx scripts/apply-exams-migration.ts --check   # vérifie uniquement
 *
 *  NB : le script est IDEMPOTENT — relançable sans risque.
 */

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
        (body && (body.message || body.error || body.details)) ||
        `HTTP ${res.status}`,
    };
  }
  return { ok: true, data: body?.result ?? body };
}

async function main() {
  console.log(`🔎 Projet Supabase : ${projectRef}`);

  // 1. Vérification directe dans la base (information_schema).
  const check = await runSql(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'exams'`,
  );
  if (!check.ok) {
    console.error('❌ Échec de la connexion Management API :', check.error);
    process.exitCode = 1;
    return;
  }
  const tableExists = Array.isArray(check.data) && check.data.length > 0;
  console.log(
    tableExists
      ? '✅ La table public.exams existe déjà dans la base.'
      : 'ℹ️  La table public.exams est ABSENTE — application de la migration…',
  );

  if (CHECK_ONLY) {
    console.log(tableExists ? '✅ OK : la migration est appliquée.' : 'ℹ️ Migration non appliquée.');
    return;
  }
  if (tableExists) {
    console.log('✅ Rien à faire (migration déjà appliquée).');
    return;
  }

  // 2. Application de la migration (idempotente).
  const sqlPath = path.join(process.cwd(), 'supabase', 'APPLY-EXAMS-MIGRATION.sql');
  if (!existsSync(sqlPath)) {
    console.error(`❌ Fichier introuvable : ${sqlPath}`);
    process.exitCode = 1;
    return;
  }
  const ddl = readFileSync(sqlPath, 'utf8');
  console.log(`   Exécution de ${path.basename(sqlPath)}…`);

  const apply = await runSql(ddl);
  if (!apply.ok) {
    console.error('❌ Échec de la migration :', apply.error);
    process.exitCode = 1;
    return;
  }
  console.log('✅ Migration appliquée avec succès.');

  // 3. Contre-vérification.
  const recheck = await runSql(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'exams'`,
  );
  const okNow = Array.isArray(recheck.data) && recheck.data.length > 0;
  console.log(okNow ? '✅ Confirmation : public.exams est bien présente.' : '⚠️ Contre-vérification échouée.');
}

main().catch((err) => {
  console.error('❌ Erreur fatale :', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
