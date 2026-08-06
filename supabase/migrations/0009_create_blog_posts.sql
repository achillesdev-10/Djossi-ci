-- ============================================================================
--  TravaillerEnCi — Migration Supabase 0009
--  Description : table `blog_posts` pour le blog public (géré depuis le
--  dashboard admin, section /admin/blog).
--
--  Le contenu des articles est rédigé en Markdown simple. Seul le statut
--  "published" rend un article visible sur /blog.
--
--  RLS : lecture publique des articles PUBLIÉS uniquement. Les écritures
--  passent par la route serveur /api/admin/blog (service_role, contourne
--  la RLS) après authentification admin.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blog_posts (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title        text NOT NULL,
    slug         text NOT NULL UNIQUE,
    excerpt      text,
    content      text NOT NULL,
    cover_image  text,
    author       text NOT NULL DEFAULT 'TravaillerenCi',
    tags         text,
    status       text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'published', 'archived')),
    published_at timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_status_published
    ON public.blog_posts (status, published_at DESC);

COMMENT ON TABLE public.blog_posts
    IS 'Articles du blog TravaillerenCi, gérés depuis le dashboard admin.';

-- ----------------------------------------------------------------------------
--  RLS : lecture publique des articles publiés uniquement
-- ----------------------------------------------------------------------------
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_posts lecture publique (publiés)" ON public.blog_posts;
CREATE POLICY "blog_posts lecture publique (publiés)"
    ON public.blog_posts FOR SELECT
    USING (status = 'published');

-- ----------------------------------------------------------------------------
--  Articles d'accueil (idempotents : insérés une seule fois par slug)
-- ----------------------------------------------------------------------------
INSERT INTO public.blog_posts
    (title, slug, excerpt, content, author, tags, status, published_at)
VALUES
    (
        'Bienvenue sur le blog TravaillerenCi',
        'bienvenue-sur-le-blog-travaillerenci',
        'Découvrez les coulisses de la plateforme et tout ce que vous devez savoir pour trouver un emploi en Côte d\'Ivoire.',
        E'## Bienvenue !\n\n**TravaillerenCi** est la plateforme ivoirienne qui centralise les offres d\'emploi, de stages, de bourses et de concours administratifs.\n\nSur ce blog, nous partagerons régulièrement :\n\n- Des conseils pour réussir vos candidatures\n- Les tendances du marché du travail en Côte d\'Ivoire\n- Les actualités de la plateforme et les nouvelles fonctionnalités\n- Des témoignages de candidats et de recruteurs\n\n## Comment utiliser la plateforme ?\n\n- **Parcourez** les offres vérifiées sur la page d\'accueil\n- **Filtrez** par ville, secteur ou type de contrat\n- **Postulez** en un clic via le lien ou l\'email de l\'annonce\n- **Créez votre CV** professionnel avec le générateur assisté par IA\n\nBon courage dans vos recherches, et à très vite ! 🇨🇮',
        'AchillesDev10',
        'plateforme, actualites, bienvenue',
        'published',
        now()
    ),
    (
        '5 conseils pour réussir sa candidature en Côte d\'Ivoire',
        'conseils-candidature-cote-divoire',
        'CV, lettre de motivation, entretien : les bons réflexes pour vous démarquer auprès des recruteurs ivoiriens.',
        E'## Votre candidature mérite mieux qu\'un envoi en masse\n\nVoici les conseils que nous donnons le plus souvent aux candidats :\n\n## 1. Adaptez votre CV à chaque offre\n\nUn CV générique est repéré en quelques secondes. Reprenez les **mots-clés de l\'annonce** (intitulé du poste, compétences demandées) et mettez en avant vos expériences les plus pertinentes.\n\n## 2. Soignez votre lettre de motivation\n\nAdressez-vous à l\'entreprise par son nom, citez une réalisation concrète et expliquez **pourquoi vous** plutôt qu\'un autre.\n\n## 3. Vérifiez vos coordonnées\n\nUne simple faute dans votre email ou votre numéro peut vous coûter un entretien. Relisez tout avant d\'envoyer.\n\n## 4. Préparez vos références\n\nLes recruteurs ivoiriens apprécient les recommandations vérifiables : prévoyez deux ou trois personnes prêtes à parler de vous.\n\n## 5. Relancez poliment\n\nUne relance courtoise **7 à 10 jours** après l\'envoi montre votre motivation et vous démarque des autres candidats.\n\nBon courage, et n\'oubliez pas : le générateur de CV de TravaillerenCi est là pour vous aider ! ✨',
        'AchillesDev10',
        'conseils, cv, candidature',
        'published',
        now() - interval '2 days'
    )
ON CONFLICT (slug) DO NOTHING;
