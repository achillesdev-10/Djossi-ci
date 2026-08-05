-- ============================================================================
--  TravaillerEnCi — Schéma Supabase (PostgreSQL)
--  Fichier : 0001_create_jobs_table.sql
--  Description : Création de la table principale des offres d'emploi.
--
--  À APPLIQUER :
--    1) via Supabase Dashboard > SQL Editor
--    2) ou via `supabase db push` (CLI Supabase : npm i -g supabase)
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Table : job_offers
--  Offres d'emploi publiées sur TravaillerEnCi
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_offers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title           TEXT        NOT NULL,
    company         TEXT        NOT NULL,
    location        TEXT        NOT NULL,

    contract_type   TEXT        NOT NULL
                    CONSTRAINT contract_type_check
                    CHECK (contract_type IN ('CDI','CDD','Stage','Prestation','Alternance','Freelance')),

    description     TEXT        NOT NULL,

    -- Postulation : au moins un des deux liens/emails doit être renseigné
    apply_link      TEXT,
    apply_email     TEXT,
    CONSTRAINT valid_apply_method CHECK (
        apply_link IS NOT NULL OR apply_email IS NOT NULL
    ),

    -- Transparence : URL d'origine de l'annonce (site agrégé, annonce originale…)
    source_url      TEXT,

    -- Badge de confiance : offre vérifiée par l'équipe TravaillerEnCi
    is_verified     BOOLEAN     NOT NULL DEFAULT FALSE,

    -- Horodatages
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
--  Index de performance (recherche texte + tri + filtres courants)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_jobs_title_gin
    ON public.job_offers USING GIN (to_tsvector('french', title));

CREATE INDEX IF NOT EXISTS idx_jobs_location
    ON public.job_offers (location);

CREATE INDEX IF NOT EXISTS idx_jobs_contract_type
    ON public.job_offers (contract_type);

CREATE INDEX IF NOT EXISTS idx_jobs_created_at
    ON public.job_offers (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_verified_created
    ON public.job_offers (is_verified DESC, created_at DESC);

-- ----------------------------------------------------------------------------
--  Trigger : updated_at auto à chaque modification
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON public.job_offers;
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.job_offers
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_set_timestamp();

-- ----------------------------------------------------------------------------
--  Row Level Security (RLS) — bonne pratique Supabase
--      * Tout le monde peut LIRE (anon)
--      * Seul un admin peut ÉCRIRE / MODIFIER
--      (On suppose que l'insertion se fait soit via une API key côté admin,
--       soit via un Service Role côté serveur Next.js)
-- ----------------------------------------------------------------------------
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut lire les offres actives" ON public.job_offers;
CREATE POLICY "Tout le monde peut lire les offres actives"
    ON public.job_offers FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Insertion réservée aux admins" ON public.job_offers;
CREATE POLICY "Insertion réservée aux admins"
    ON public.job_offers FOR INSERT
    WITH CHECK (FALSE);     -- passe par service_role côté serveur

DROP POLICY IF EXISTS "Modif réservée aux admins" ON public.job_offers;
CREATE POLICY "Modif réservée aux admins"
    ON public.job_offers FOR UPDATE
    USING (FALSE);

-- ============================================================================
--  Commentaires / Métadonnées
-- ============================================================================
COMMENT ON TABLE  public.job_offers                IS 'Offres d''emploi TravaillerEnCi (Côte d''Ivoire)';
COMMENT ON COLUMN public.job_offers.id             IS 'UUID unique de l''offre (gen_random_uuid)';
COMMENT ON COLUMN public.job_offers.title          IS 'Titre du poste : ex "Développeur Full Stack Senior"';
COMMENT ON COLUMN public.job_offers.company        IS 'Nom de l''entreprise : ex "MTN Côte d''Ivoire"';
COMMENT ON COLUMN public.job_offers.location       IS 'Ville / Commune : ex "Abidjan - Cocody", "Bouaké", "Yamoussoukro"';
COMMENT ON COLUMN public.job_offers.contract_type  IS 'Type de contrat (enum) : CDI / CDD / Stage / Prestation / Alternance / Freelance';
COMMENT ON COLUMN public.job_offers.description    IS 'Fiche de poste complète (missions, profil recherché, compétences…)';
COMMENT ON COLUMN public.job_offers.apply_link     IS 'URL de candidature externe (formulaire entreprise, JobTeaser…)';
COMMENT ON COLUMN public.job_offers.apply_email    IS 'Email de candidature (ex : recrutement@entreprise.ci)';
COMMENT ON COLUMN public.job_offers.source_url     IS 'Transparence : URL d''origine de l''annonce (agrégation, annonce originale)';
COMMENT ON COLUMN public.job_offers.is_verified    IS 'Badge de confiance : offre vérifiée par l''équipe TravaillerEnCi';
COMMENT ON COLUMN public.job_offers.created_at     IS 'Date et heure de création (UTC avec fuseau horaire)';
COMMENT ON COLUMN public.job_offers.updated_at     IS 'Date de dernière mise à jour (trigger auto)';
-- Migration: Create profiles, roles, and applications for TravaillerEnCi
-- Path: supabase/migrations/0002_create_auth_profiles.sql

CREATE TYPE user_role AS ENUM ('candidate', 'company', 'admin');

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'candidate',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles_candidate (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_whatsapp TEXT,
    headline TEXT,
    cv_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles_company (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    logo_url TEXT,
    website TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.job_offers(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.profiles_candidate(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
    cover_letter TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_candidate_job UNIQUE(job_id, candidate_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_candidate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Candidate profiles viewable by everyone" ON public.profiles_candidate FOR SELECT USING (true);
CREATE POLICY "Candidates can update their own profile" ON public.profiles_candidate FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Company profiles viewable by everyone" ON public.profiles_company FOR SELECT USING (true);
CREATE POLICY "Companies can update their own profile" ON public.profiles_company FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Candidates can view their applications" ON public.applications FOR SELECT USING (auth.uid() = candidate_id);
CREATE POLICY "Candidates can create applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = candidate_id);
-- ============================================================================
--  TravaillerEnCi — Migration Supabase (PostgreSQL)
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
-- ============================================================================
--  TravaillerEnCi — Migration Supabase 0005
--  Description : ajoute la colonne `deadline` (date limite de candidature)
--  aux offres, pour l'affichage admin et l'expiration automatique.
-- ============================================================================

ALTER TABLE public.job_offers
ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_jobs_deadline
ON public.job_offers (deadline);

COMMENT ON COLUMN public.job_offers.deadline
IS 'Date limite de candidature (scrapée ou saisie par un admin). Les offres dont la deadline est dépassée passent automatiquement en expirées/archivées.';
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

-- ============================================================================
--  TravaillerEnCi — Migration Supabase 0007
--  Description : colonne `category` (dépôt unifié : emplois, stages, bourses, concours)
-- ============================================================================

ALTER TABLE public.job_offers
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'job'
CONSTRAINT job_offers_category_check
CHECK (category IN ('job', 'internship', 'scholarship', 'exam'));

CREATE INDEX IF NOT EXISTS idx_job_offers_category
ON public.job_offers (category);

COMMENT ON COLUMN public.job_offers.category
IS 'Type de contenu : job (emploi), internship (stage), scholarship (bourse), exam (concours)';
