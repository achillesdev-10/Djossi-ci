-- Migration: OAuth Google — colonne google_sub sur users
-- Path: supabase/migrations/0012_google_oauth.sql
--
-- Permet aux comptes créés via /api/auth/google/callback d'être reliés à leur
-- identifiant Google (sub). Un même sub ne peut correspondre qu'à un seul
-- compte (index UNIQUE). Les comptes existants (email/mot de passe) peuvent
-- être liés rétroactivement à un compte Google lors de la première connexion.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_sub TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON public.users (google_sub);

COMMENT ON COLUMN public.users.google_sub IS
    'Identifiant Google (sub) pour les comptes créés via OAuth Google — nullable, unique.';
