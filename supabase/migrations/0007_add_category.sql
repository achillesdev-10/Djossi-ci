-- ============================================================================
--  TravaillerEnCi — Migration Supabase 0007
--  Description : ajoute la colonne `category` à `job_offers` pour faire de la
--  table un DÉPÔT UNIFIÉ de contenus (emplois, stages, bourses, concours).
--
--      category = 'job' (défaut) | 'internship' | 'scholarship' | 'exam'
--
--  Le scraper écrit tous les contenus en statut 'pending' ; l'admin les
--  modère (éditer / valider / publier / supprimer) dans le dashboard.
-- ============================================================================

ALTER TABLE public.job_offers
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'job'
CONSTRAINT job_offers_category_check
CHECK (category IN ('job', 'internship', 'scholarship', 'exam'));

CREATE INDEX IF NOT EXISTS idx_job_offers_category
ON public.job_offers (category);

COMMENT ON COLUMN public.job_offers.category
IS 'Type de contenu : job (emploi), internship (stage), scholarship (bourse), exam (concours)';
