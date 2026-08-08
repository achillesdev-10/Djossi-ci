-- Migration: Migration des anciens comptes simulés (localStorage)
-- Path: supabase/migrations/0013_migrated_users.sql
--
-- Les anciens comptes créés en mode démo (localStorage, sans mot de passe
-- réel) sont importés dans la table `users` avec un mot de passe aléatoire
-- inutilisable et le drapeau `needs_password_reset` à true. L'utilisateur
-- doit ensuite définir un vrai mot de passe (via /api/auth/set-password),
-- se connecter avec Google, ou passer par « mot de passe oublié ».

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS needs_password_reset BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.users.needs_password_reset IS
    'Vrai si le compte n''a pas encore de mot de passe défini par l''utilisateur (comptes migrés depuis localStorage ou créés via Google).';
