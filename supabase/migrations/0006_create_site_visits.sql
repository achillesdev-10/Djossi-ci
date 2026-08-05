-- ============================================================================
--  TravaillerEnCi — Migration Supabase 0006
--  Description : table `site_visits` (analytics) — alimentée par la route
--  /api/analytics/track, lue par la page admin /admin/analytics.
--
--  À APPLIQUER :
--    1) Supabase Dashboard > SQL Editor (coller le contenu), OU
--    2) `supabase db push` (CLI Supabase : npm i -g supabase)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_visits (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path        TEXT NOT NULL,
    ip_hash     TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_created_at
ON public.site_visits (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_visits_path
ON public.site_visits (path);

-- RLS : lecture réservée au service_role (côté serveur), écriture via la
-- route serveur /api/analytics/track (service_role contourne la RLS).
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_visits lecture service_role" ON public.site_visits;
CREATE POLICY "site_visits lecture service_role"
    ON public.site_visits FOR SELECT
    USING (FALSE);

DROP POLICY IF EXISTS "site_visits insertion service_role" ON public.site_visits;
CREATE POLICY "site_visits insertion service_role"
    ON public.site_visits FOR INSERT
    WITH CHECK (FALSE);

COMMENT ON TABLE  public.site_visits             IS 'Visites du site (analytics) : une ligne par page vue';
COMMENT ON COLUMN public.site_visits.path        IS 'Chemin de la page visitée (ex: /jobs, /jobs/abc)';
COMMENT ON COLUMN public.site_visits.ip_hash     IS 'Empreinte de l''IP (anonymisée, base64 tronqué) pour les visiteurs uniques';
COMMENT ON COLUMN public.site_visits.user_agent  IS 'User-Agent du navigateur (détection mobile/desktop)';
