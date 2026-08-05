-- ============================================================================
--  Djossi.ci — Migration Supabase 0005
--  Description : ajoute la colonne `deadline` (date limite de candidature)
--  aux offres, pour l'affichage admin et l'expiration automatique.
--
--  À APPLIQUER :
--    1) Supabase Dashboard > SQL Editor (coller le contenu), OU
--    2) `supabase db push` (CLI Supabase : npm i -g supabase)
-- ============================================================================

-- ----------------------------------------------------------------------------
--  1. Colonne deadline sur public.job_offers
-- ----------------------------------------------------------------------------
ALTER TABLE public.job_offers
ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- Index pour l'expiration automatique (WHERE deadline < now())
CREATE INDEX IF NOT EXISTS idx_jobs_deadline
ON public.job_offers (deadline);

COMMENT ON COLUMN public.job_offers.deadline
IS 'Date limite de candidature (scrapée ou saisie par un admin). Les offres dont la deadline est dépassée passent automatiquement en expirées/archivées.';
