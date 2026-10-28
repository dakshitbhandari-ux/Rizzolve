-- ==============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Core Schema for Doubt Chain (B2B Multi-Tenant SaaS Platform)
-- Enforces:
--   1. pg_trgm extension for fuzzy duplicate detection.
--   2. Multi-tenant data isolation via university_id.
--   3. Row Level Security (RLS) policies for tenant boundaries.
--   4. Gamification fields (reputation, bounties, accepted answers, upvotes).
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. CUSTOM TYPES & ENUMS
CREATE TYPE public.user_role AS ENUM ('STUDENT', 'FACULTY', 'ADMIN');
CREATE TYPE public.doubt_status AS ENUM ('OPEN', 'RESOLVED', 'BOUNTIED');

-- ==============================================================================
-- 3. TABLES DEFINITION
-- ==============================================================================

-- 3.1 Universities (Tenant Entity)
CREATE TABLE public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  allowed_domains TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.2 Profiles (Linked 1-to-1 with Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'STUDENT',
  reputation INTEGER NOT NULL DEFAULT 0 CHECK (reputation >= 0),
  badges TEXT[] NOT NULL DEFAULT '{}',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.3 Communities (Subject / Course Boards scoped to University)
CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  join_code TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  moderators UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.4 Doubts (Questions posted by students/faculty)
CREATE TABLE public.doubts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status public.doubt_status NOT NULL DEFAULT 'OPEN',
  bounty_amount INTEGER NOT NULL DEFAULT 0 CHECK (bounty_amount >= 0),
  upvoted_by UUID[] NOT NULL DEFAULT '{}',
  downvoted_by UUID[] NOT NULL DEFAULT '{}',
  net_score INTEGER NOT NULL DEFAULT 0,
  resolved_answer_id UUID, -- Foreign key added below after answers table
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.5 Answers (Replies to Doubts)
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  doubt_id UUID NOT NULL REFERENCES public.doubts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL DEFAULT false,
  is_instructor_endorsed BOOLEAN NOT NULL DEFAULT false,
  upvoted_by UUID[] NOT NULL DEFAULT '{}',
  downvoted_by UUID[] NOT NULL DEFAULT '{}',
  net_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add deferred foreign key for resolved_answer_id on doubts
ALTER TABLE public.doubts
  ADD CONSTRAINT fk_doubts_resolved_answer
  FOREIGN KEY (resolved_answer_id)
  REFERENCES public.answers(id)
  ON DELETE SET NULL;

-- ==============================================================================
-- 4. PERFORMANCE & SEARCH INDEXES
-- ==============================================================================

-- Trigram GIN index on doubt titles for fast fuzzy search-before-posting
CREATE INDEX idx_doubts_title_trgm ON public.doubts USING gin (title gin_trgm_ops);

-- Tenant Isolation and Foreign Key Lookups
CREATE INDEX idx_profiles_university_id ON public.profiles(university_id);
CREATE INDEX idx_communities_university_id ON public.communities(university_id);
CREATE INDEX idx_doubts_university_id ON public.doubts(university_id);
CREATE INDEX idx_doubts_community_id ON public.doubts(community_id);
CREATE INDEX idx_doubts_author_id ON public.doubts(author_id);
CREATE INDEX idx_doubts_status ON public.doubts(status);
CREATE INDEX idx_answers_doubt_id ON public.answers(doubt_id);
CREATE INDEX idx_answers_university_id ON public.answers(university_id);
CREATE INDEX idx_answers_author_id ON public.answers(author_id);

-- ==============================================================================
-- 5. AUTOMATED TIMESTAMP TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_universities_updated BEFORE UPDATE ON public.universities FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER trg_communities_updated BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER trg_doubts_updated BEFORE UPDATE ON public.doubts FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER trg_answers_updated BEFORE UPDATE ON public.answers FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ==============================================================================
-- 6. MULTI-TENANT ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Helper function: Extracts current user's university_id securely and efficiently
CREATE OR REPLACE FUNCTION public.get_auth_university_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT university_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Enable RLS across all application tables
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- 6.1 Universities Policies
-- Authenticated users can view their own university details
CREATE POLICY "universities_select_own"
  ON public.universities
  FOR SELECT
  TO authenticated
  USING (id = public.get_auth_university_id());

-- 6.2 Profiles Policies
-- Users can view profiles belonging to peers in the same university
CREATE POLICY "profiles_select_same_university"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (university_id = public.get_auth_university_id());

-- Users can update only their own profile details
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 6.3 Communities Policies
-- STRICT REQUIREMENT: Users can ONLY select communities where university_id matches their own profile's university_id
CREATE POLICY "communities_select_same_university"
  ON public.communities
  FOR SELECT
  TO authenticated
  USING (university_id = public.get_auth_university_id());

-- Community creation: Scoped strictly to the user's university
CREATE POLICY "communities_insert_same_university"
  ON public.communities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    university_id = public.get_auth_university_id()
    AND (created_by IS NULL OR created_by = auth.uid())
  );

-- 6.4 Doubts Policies
-- STRICT REQUIREMENT: Users can ONLY select doubts where university_id matches their own profile's university_id
CREATE POLICY "doubts_select_same_university"
  ON public.doubts
  FOR SELECT
  TO authenticated
  USING (university_id = public.get_auth_university_id());

-- Doubt creation: Scoped strictly to user's university and author identity
CREATE POLICY "doubts_insert_same_university"
  ON public.doubts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    university_id = public.get_auth_university_id()
    AND author_id = auth.uid()
  );

-- Doubt update: Only author can modify their doubt
CREATE POLICY "doubts_update_own"
  ON public.doubts
  FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    AND university_id = public.get_auth_university_id()
  )
  WITH CHECK (
    author_id = auth.uid()
    AND university_id = public.get_auth_university_id()
  );

-- 6.5 Answers Policies
-- Users can view answers within their own university
CREATE POLICY "answers_select_same_university"
  ON public.answers
  FOR SELECT
  TO authenticated
  USING (university_id = public.get_auth_university_id());

-- Users can insert answers to doubts within their university
CREATE POLICY "answers_insert_same_university"
  ON public.answers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    university_id = public.get_auth_university_id()
    AND author_id = auth.uid()
  );

-- Users can edit their own answers
CREATE POLICY "answers_update_own"
  ON public.answers
  FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    AND university_id = public.get_auth_university_id()
  )
  WITH CHECK (
    author_id = auth.uid()
    AND university_id = public.get_auth_university_id()
  );
