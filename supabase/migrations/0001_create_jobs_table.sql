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
