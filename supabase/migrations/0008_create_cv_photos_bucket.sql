-- ============================================================================
--  TravaillerEnCi — Migration Supabase 0008
--  Description : bucket Storage public `cv-photos` pour les photos de profil
--  des CV générés sur /generateur-de-cv.
--
--  Les uploads passent par la route serveur /api/cv/photo (service_role,
--  contourne la RLS). Seule la lecture publique est autorisée via policy.
--
--  À APPLIQUER :
--    1) Supabase Dashboard > SQL Editor (coller le contenu), OU
--    2) `supabase db push` (CLI Supabase : npm i -g supabase)
-- ============================================================================

-- Bucket public, limité à 5 Mo par fichier, formats images uniquement.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'cv-photos',
    'cv-photos',
    TRUE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique des photos (affichage sur le CV + export PDF).
DROP POLICY IF EXISTS "cv_photos lecture publique" ON storage.objects;
CREATE POLICY "cv_photos lecture publique"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'cv-photos');

