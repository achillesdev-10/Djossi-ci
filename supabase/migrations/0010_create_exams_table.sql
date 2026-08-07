-- ============================================================================
--  TravaillerEnCi — Migration Supabase 0010
--  Description : table dédiée `exams` — Module Concours Administratifs
--
--  Remplaçante du dépôt unifié `job_offers` (category='exam') pour la gestion
--  riche des concours : éligibilité structurée (âge, nationalité, diplômes),
--  dates clés (inscription, épreuves, résultats), documents PDF, confiance IA.
--
--  À APPLIQUER :
--    1) Supabase Dashboard > SQL Editor (coller le contenu), OU
--    2) `supabase db push` (CLI Supabase : npm i -g supabase)
--
--  Conventions :
--    - `status`      : pending (modération) → published / rejected / archived
--    - `category`    : administratif, sante, enseignement, securite, militaire, autre
--    - `exam_type`   : recrutement_nouveau, promotion, concours_direct,
--                      concours_professionnel, entree_ecole, examen
--    - `diplomas[]`  : CEPE, BEPC, CAP/BEP, BAC, BTS/DUT, Licence, Master, Doctorat
--    - `min_diploma_level` : niveau le plus bas accepté (1=CEPE … 8=Doctorat),
--                      calculé à l'insertion pour un filtrage « accessibles
--                      avec mon diplôme » rapide et indexé.
--    - `confidence`  : fiabilité de l'extraction IA (low / medium / high) —
--                      priorise la relecture manuelle en modération.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Table : exams
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exams (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               TEXT        NOT NULL,
    slug                TEXT,
    organizer           TEXT        NOT NULL,   -- ministère / institut organisateur
    category            TEXT        NOT NULL DEFAULT 'administratif'
                        CONSTRAINT exams_category_check
                        CHECK (category IN ('administratif','sante','enseignement','securite','militaire','autre')),
    exam_type           TEXT
                        CONSTRAINT exams_exam_type_check
                        CHECK (exam_type IN ('recrutement_nouveau','promotion','concours_direct','concours_professionnel','entree_ecole','examen')),
    status              TEXT        NOT NULL DEFAULT 'pending'
                        CONSTRAINT exams_status_check
                        CHECK (status IN ('pending','published','rejected','archived')),
    description_md      TEXT        NOT NULL DEFAULT '',
    registration_start  TIMESTAMPTZ,
    registration_end    TIMESTAMPTZ,            -- date limite d'inscription
    exam_date           TIMESTAMPTZ,            -- date des épreuves
    results_date        TIMESTAMPTZ,            -- date des résultats
    age_min             INTEGER,
    age_max             INTEGER,
    age_reference_date  TEXT,                   -- ex : « au 31 décembre 2026 »
    nationality         TEXT,
    diplomas            TEXT[]      NOT NULL DEFAULT '{}',
    min_diploma_level   INTEGER,                -- niveau minimal accepté (1..8)
    positions_count     INTEGER,
    registration_fee    TEXT,                   -- ex : « 10 000 FCFA »
    location            TEXT,
    cities              TEXT[]      NOT NULL DEFAULT '{}',
    documents           JSONB       NOT NULL DEFAULT '[]',  -- [{name, url}]
    source_url          TEXT,                   -- lien officiel (obligatoire avant publication)
    source_website      TEXT,
    confidence          TEXT        NOT NULL DEFAULT 'medium'
                        CONSTRAINT exams_confidence_check
                        CHECK (confidence IN ('low','medium','high')),
    views_count         INTEGER     NOT NULL DEFAULT 0,
    is_verified         BOOLEAN     NOT NULL DEFAULT FALSE,
    seo_title           TEXT,
    seo_description     TEXT,
    seo_keywords        TEXT,
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
--  Index (filtres courants + recherche plein texte)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_exams_status
    ON public.exams (status);
CREATE INDEX IF NOT EXISTS idx_exams_category
    ON public.exams (category);
CREATE INDEX IF NOT EXISTS idx_exams_organizer
    ON public.exams (organizer);
CREATE INDEX IF NOT EXISTS idx_exams_registration_end
    ON public.exams (registration_end);
CREATE INDEX IF NOT EXISTS idx_exams_min_diploma_level
    ON public.exams (min_diploma_level);
CREATE INDEX IF NOT EXISTS idx_exams_created_at
    ON public.exams (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exams_diplomas_gin
    ON public.exams USING GIN (diplomas);

CREATE INDEX IF NOT EXISTS idx_exams_title_gin
    ON public.exams USING GIN (to_tsvector('french', title || ' ' || organizer || ' ' || description_md));

-- Slug unique (si renseigné)
CREATE UNIQUE INDEX IF NOT EXISTS idx_exams_slug_unique
    ON public.exams (slug) WHERE slug IS NOT NULL;

-- ----------------------------------------------------------------------------
--  Trigger : updated_at auto
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_timestamp ON public.exams;
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON public.exams
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_set_timestamp();

-- ----------------------------------------------------------------------------
--  Row Level Security (RLS) — mêmes règles que job_offers :
--      * tout le monde peut LIRE
--      * écritures réservées au service_role (côté serveur / scraper)
-- ----------------------------------------------------------------------------
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exams lecture publique" ON public.exams;
CREATE POLICY "exams lecture publique"
    ON public.exams FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "exams écriture service_role" ON public.exams;
CREATE POLICY "exams écriture service_role"
    ON public.exams FOR INSERT
    WITH CHECK (FALSE);

DROP POLICY IF EXISTS "exams modif service_role" ON public.exams;
CREATE POLICY "exams modif service_role"
    ON public.exams FOR UPDATE
    USING (FALSE);

DROP POLICY IF EXISTS "exams suppression service_role" ON public.exams;
CREATE POLICY "exams suppression service_role"
    ON public.exams FOR DELETE
    USING (FALSE);

-- ----------------------------------------------------------------------------
--  Commentaires
-- ----------------------------------------------------------------------------
COMMENT ON TABLE  public.exams IS 'Concours administratifs (Côte d''Ivoire) — module dédié, alimenté par les sources officielles';
COMMENT ON COLUMN public.exams.title IS 'Intitulé du concours (ex : Concours direct ENA cycle moyen)';
COMMENT ON COLUMN public.exams.organizer IS 'Organisateur (Ministère de la Fonction Publique, ENA, INFAS…)';
COMMENT ON COLUMN public.exams.category IS 'Catégorie : administratif, sante, enseignement, securite, militaire, autre';
COMMENT ON COLUMN public.exams.exam_type IS 'Type : recrutement_nouveau, promotion, concours_direct, concours_professionnel, entree_ecole, examen';
COMMENT ON COLUMN public.exams.status IS 'Statut de modération : pending, published, rejected, archived';
COMMENT ON COLUMN public.exams.diplomas IS 'Diplômes acceptés (CEPE, BEPC, BAC, Licence, Master…)';
COMMENT ON COLUMN public.exams.min_diploma_level IS 'Niveau minimal accepté (1=CEPE, 2=BEPC, 3=CAP/BEP, 4=BAC, 5=BTS/DUT, 6=Licence, 7=Master, 8=Doctorat)';
COMMENT ON COLUMN public.exams.documents IS 'Documents PDF liés (avis, arrêtés, annales) : [{name, url}]';
COMMENT ON COLUMN public.exams.confidence IS 'Fiabilité de l''extraction IA : low, medium, high';
COMMENT ON COLUMN public.exams.source_url IS 'Lien officiel de l''avis/communiqué (obligatoire avant publication)';
COMMENT ON COLUMN public.exams.views_count IS 'Nombre de vues de la fiche détail (incrémenté à chaque visite)';

-- ----------------------------------------------------------------------------
--  RPC : incrément des vues (appelée par la route publique /api/exams/[id]/view)
--  SECURITY DEFINER pour contourner la RLS en écriture (seul l'UPDATE est fait).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_exam_views(exam_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.exams
    SET views_count = views_count + 1
    WHERE id = exam_id;
END;
$$;
