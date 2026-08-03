-- ============================================================================
--  Djossi.ci — Migration Supabase (PostgreSQL)
--  Fichier : 0003_add_job_fields.sql
--  Description : Ajout des nouveaux champs et contraintes pour la table `job_offers`
-- ============================================================================

-- 1. Ajout de la colonne `status` (pending, published, rejected, archived) avec défaut 'pending'
ALTER TABLE public.job_offers 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
CONSTRAINT job_offers_status_check CHECK (status IN ('pending', 'published', 'rejected', 'archived'));

-- 2. Ajout/Vérification de `source_url` (URL exacte de la page d'origine)
ALTER TABLE public.job_offers 
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- 3. Ajout de `source_website` (Nom du site d'origine ex: Emploi.ci, Educarriere)
ALTER TABLE public.job_offers 
ADD COLUMN IF NOT EXISTS source_website TEXT;

-- 4. Ajout des champs SEO (`seo_title`, `seo_description`, `seo_keywords`)
ALTER TABLE public.job_offers 
ADD COLUMN IF NOT EXISTS seo_title TEXT;

ALTER TABLE public.job_offers 
ADD COLUMN IF NOT EXISTS seo_description TEXT;

ALTER TABLE public.job_offers 
ADD COLUMN IF NOT EXISTS seo_keywords TEXT;

-- 5. Ajout de `slug` unique pour les URLs canoniques (ex: /jobs/developpeur-fullstack-abidjan)
ALTER TABLE public.job_offers 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Si des enregistrements existent sans slug, on peut générer un slug basique ou laisser unique
-- Création d'un index unique sur slug (ignorant les NULLs ou global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_offers_slug_unique 
ON public.job_offers (slug) 
WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_offers_status 
ON public.job_offers (status);

-- Commentaires explicatifs
COMMENT ON COLUMN public.job_offers.status         IS 'Statut de l''offre : pending (en attente), published (publiée), rejected (rejetée), archived (archivée)';
COMMENT ON COLUMN public.job_offers.source_url     IS 'URL exacte de la page d''origine d''où provient l''offre (obligatoire pour le bouton Postuler)';
COMMENT ON COLUMN public.job_offers.source_website IS 'Nom du site d''origine (ex: Emploi.ci, Educarriere, LinkedIn, etc.)';
COMMENT ON COLUMN public.job_offers.seo_title      IS 'Titre optimisé pour les moteurs de recherche (SEO)';
COMMENT ON COLUMN public.job_offers.seo_description IS 'Méta-description pour Google / WhatsApp (max 160 caractères)';
COMMENT ON COLUMN public.job_offers.seo_keywords   IS 'Mots-clés SEO (séparés par des virgules ou array)';
COMMENT ON COLUMN public.job_offers.slug           IS 'Slug unique pour les URLs canoniques (ex: /jobs/developpeur-fullstack-abidjan)';
