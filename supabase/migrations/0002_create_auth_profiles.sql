-- Migration: Create profiles, roles, and applications for Djossi.ci
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
