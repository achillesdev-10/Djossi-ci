-- Migration: Authentification réelle — users + password_reset_tokens
-- Path: supabase/migrations/0011_auth_users.sql
--
-- Mot de passe oublié (réinitialisation réelle) : les comptes créés via
-- /api/auth/register stockent leur mot de passe HACHÉ (scrypt) ici, et les
-- jetons de réinitialisation (hash SHA-256, validité 1 h) dans
-- password_reset_tokens. Le client anon n'accède jamais à ces tables : la RLS
-- les ferme (USING (FALSE)) et seul le service_role (routes /api/auth) peut
-- lire/écrire — même convention que les autres migrations du projet.

CREATE TABLE IF NOT EXISTS public.users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'candidate' CHECK (role IN ('candidate','company','admin')),
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON public.password_reset_tokens (user_id);

-- RLS : fermée pour le client anon, ouverte uniquement au rôle service.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users lecture service_role"
    ON public.users FOR SELECT
    USING (FALSE);

CREATE POLICY "users insertion service_role"
    ON public.users FOR INSERT
    WITH CHECK (FALSE);

CREATE POLICY "users modif service_role"
    ON public.users FOR UPDATE
    USING (FALSE);

CREATE POLICY "users suppression service_role"
    ON public.users FOR DELETE
    USING (FALSE);

CREATE POLICY "password_reset_tokens lecture service_role"
    ON public.password_reset_tokens FOR SELECT
    USING (FALSE);

CREATE POLICY "password_reset_tokens insertion service_role"
    ON public.password_reset_tokens FOR INSERT
    WITH CHECK (FALSE);

CREATE POLICY "password_reset_tokens suppression service_role"
    ON public.password_reset_tokens FOR DELETE
    USING (FALSE);
