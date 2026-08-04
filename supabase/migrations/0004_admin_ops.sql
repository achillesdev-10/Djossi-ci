-- ============================================================================
--  TravaillerenCi — Migration Supabase 0004
--  Description : aligne le schéma PostgreSQL sur l'application (colonnes admin
--  manquantes + table des logs du scraper).
--
--  À APPLIQUER :
--    1) Supabase Dashboard > SQL Editor (coller le contenu), OU
--    2) `supabase db push` (CLI Supabase : npm i -g supabase)
-- ============================================================================

-- ----------------------------------------------------------------------------
--  1. Colonnes manquantes sur public.job_offers
-- ----------------------------------------------------------------------------
ALTER TABLE public.job_offers
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.job_offers
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.job_offers
ADD COLUMN IF NOT EXISTS clicks_count INTEGER NOT NULL DEFAULT 0;

-- Contraintes de cohérence
ALTER TABLE public.job_offers
DROP CONSTRAINT IF EXISTS job_offers_is_archived_check;
ALTER TABLE public.job_offers
ADD CONSTRAINT job_offers_is_archived_check CHECK (is_archived IN (TRUE, FALSE));

ALTER TABLE public.job_offers
DROP CONSTRAINT IF EXISTS job_offers_is_expired_check;
ALTER TABLE public.job_offers
ADD CONSTRAINT job_offers_is_expired_check CHECK (is_expired IN (TRUE, FALSE));

-- Index pour le tri / filtrage admin
CREATE INDEX IF NOT EXISTS idx_jobs_is_archived ON public.job_offers (is_archived);
CREATE INDEX IF NOT EXISTS idx_jobs_is_expired  ON public.job_offers (is_expired);
CREATE INDEX IF NOT EXISTS idx_jobs_clicks      ON public.job_offers (clicks_count DESC);

-- ----------------------------------------------------------------------------
--  2. Table scraper_logs (historique des exécutions du scraper)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scraper_logs (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status       TEXT        NOT NULL,
    offers_added INTEGER     NOT NULL DEFAULT 0,
    message      TEXT,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at  TIMESTAMPTZ
);

COMMENT ON TABLE  public.scraper_logs              IS 'Historique des exécutions du scraper d''offres d''emploi';
COMMENT ON COLUMN public.scraper_logs.status       IS 'running / success / error';
COMMENT ON COLUMN public.scraper_logs.offers_added IS 'Nombre d''offres ajoutées lors du run';

-- RLS : lecture ouverte (dashboard public), écriture réservée au service_role
ALTER TABLE public.scraper_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture scraper_logs" ON public.scraper_logs;
CREATE POLICY "Lecture scraper_logs"
    ON public.scraper_logs FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Insertion scraper_logs service_role" ON public.scraper_logs;
CREATE POLICY "Insertion scraper_logs service_role"
    ON public.scraper_logs FOR INSERT
    WITH CHECK (FALSE);

DROP POLICY IF EXISTS "Modif scraper_logs service_role" ON public.scraper_logs;
CREATE POLICY "Modif scraper_logs service_role"
    ON public.scraper_logs FOR UPDATE
    USING (FALSE);

-- ----------------------------------------------------------------------------
--  3. job_offers : autoriser les écritures admin via service_role
--     (le service_role contourne déjà la RLS, ces policies sont un garde-fou
--      supplémentaire : un utilisateur connecté dont le profil a le rôle
--      'admin' peut modifier les offres. Table réelle : public.profiles.)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Modif réservée aux admins" ON public.job_offers;
CREATE POLICY "Modif réservée aux admins"
    ON public.job_offers FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );
