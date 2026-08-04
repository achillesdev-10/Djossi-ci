/**
 *  TravaillerenCi — supabase.ts
 *
 *  Client Supabase côté SERVEUR uniquement (jamais importé d'un composant
 *  client). Utilise la clé `service_role` qui contourne la RLS — indispensable
 *  pour les écritures admin (valider / éditer / supprimer les offres) en
 *  production, où le filesystem est en lecture seule (SQLite impossible).
 *
 *  NB : ne pas importer ce module depuis un composant client ('use client')
 *  — la clé service_role ne doit jamais fuiter dans le navigateur.
 */
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getDatabaseConfig } from '@/lib/config';

let cachedClient: SupabaseClient | null = null;

/** Vrai si le fournisseur configuré est Supabase ET que les clés existent. */
export function isSupabaseConfigured(): boolean {
  const { provider } = getDatabaseConfig();
  if (provider !== 'supabase') return false;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

/**
 * Retourne le client Supabase serveur (service_role si dispo, sinon anon).
 * Retourne null si Supabase n'est pas configuré.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = serviceRole || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!serviceRole) {
    // Sans service_role, les écritures admin échoueront à cause de la RLS.
    // On avertit bruyamment plutôt que d'échouer silencieusement.
    console.warn(
      '[supabase] SUPABASE_SERVICE_ROLE_KEY manquant : les LECTURES fonctionneront, mais les écritures admin (valider/éditer/supprimer) seront bloquées par la RLS.',
    );
  }

  cachedClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
}
