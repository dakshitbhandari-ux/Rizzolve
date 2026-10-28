-- ==============================================================================
-- Doubt Chain: Consolidated Cloud Setup Script (001 -> 004 + Seed)
-- Run this in your Supabase Dashboard SQL Editor (https://supabase.com)
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS & CUSTOM ENUMS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('STUDENT', 'FACULTY', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.doubt_status AS ENUM ('OPEN', 'RESOLVED', 'BOUNTIED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. TABLES DEFINITIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  allowed_domains TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.profiles (
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

CREATE TABLE IF NOT EXISTS public.communities (
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

CREATE TABLE IF NOT EXISTS public.doubts (
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
  resolved_answer_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.answers (
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

DO $$ BEGIN
  ALTER TABLE public.doubts
    ADD CONSTRAINT fk_doubts_resolved_answer
    FOREIGN KEY (resolved_answer_id)
    REFERENCES public.answers(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. INDEXES & RLS
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_doubts_title_trgm ON public.doubts USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_university_id ON public.profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_communities_university_id ON public.communities(university_id);
CREATE INDEX IF NOT EXISTS idx_doubts_university_id ON public.doubts(university_id);
CREATE INDEX IF NOT EXISTS idx_doubts_community_id ON public.doubts(community_id);
CREATE INDEX IF NOT EXISTS idx_doubts_author_id ON public.doubts(author_id);
CREATE INDEX IF NOT EXISTS idx_doubts_status ON public.doubts(status);
CREATE INDEX IF NOT EXISTS idx_answers_doubt_id ON public.answers(doubt_id);
CREATE INDEX IF NOT EXISTS idx_answers_university_id ON public.answers(university_id);
CREATE INDEX IF NOT EXISTS idx_answers_author_id ON public.answers(author_id);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_universities_updated ON public.universities;
CREATE TRIGGER trg_universities_updated BEFORE UPDATE ON public.universities FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_communities_updated ON public.communities;
CREATE TRIGGER trg_communities_updated BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_doubts_updated ON public.doubts;
CREATE TRIGGER trg_doubts_updated BEFORE UPDATE ON public.doubts FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_answers_updated ON public.answers;
CREATE TRIGGER trg_answers_updated BEFORE UPDATE ON public.answers FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- RLS Helper
CREATE OR REPLACE FUNCTION public.get_auth_university_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT university_id FROM public.profiles WHERE id = auth.uid();
$$;

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "universities_select_own" ON public.universities;
CREATE POLICY "universities_select_own" ON public.universities FOR SELECT TO authenticated USING (id = public.get_auth_university_id());

DROP POLICY IF EXISTS "profiles_select_same_university" ON public.profiles;
CREATE POLICY "profiles_select_same_university" ON public.profiles FOR SELECT TO authenticated USING (university_id = public.get_auth_university_id());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "communities_select_same_university" ON public.communities;
CREATE POLICY "communities_select_same_university" ON public.communities FOR SELECT TO authenticated USING (university_id = public.get_auth_university_id());

DROP POLICY IF EXISTS "communities_insert_same_university" ON public.communities;
CREATE POLICY "communities_insert_same_university" ON public.communities FOR INSERT TO authenticated WITH CHECK (
  university_id = public.get_auth_university_id() AND (created_by IS NULL OR created_by = auth.uid())
);

DROP POLICY IF EXISTS "doubts_select_same_university" ON public.doubts;
CREATE POLICY "doubts_select_same_university" ON public.doubts FOR SELECT TO authenticated USING (university_id = public.get_auth_university_id());

DROP POLICY IF EXISTS "doubts_insert_same_university" ON public.doubts;
CREATE POLICY "doubts_insert_same_university" ON public.doubts FOR INSERT TO authenticated WITH CHECK (
  university_id = public.get_auth_university_id() AND author_id = auth.uid()
);

DROP POLICY IF EXISTS "doubts_update_own" ON public.doubts;
CREATE POLICY "doubts_update_own" ON public.doubts FOR UPDATE TO authenticated USING (
  author_id = auth.uid() AND university_id = public.get_auth_university_id()
) WITH CHECK (
  author_id = auth.uid() AND university_id = public.get_auth_university_id()
);

DROP POLICY IF EXISTS "answers_select_same_university" ON public.answers;
CREATE POLICY "answers_select_same_university" ON public.answers FOR SELECT TO authenticated USING (university_id = public.get_auth_university_id());

DROP POLICY IF EXISTS "answers_insert_same_university" ON public.answers;
CREATE POLICY "answers_insert_same_university" ON public.answers FOR INSERT TO authenticated WITH CHECK (
  university_id = public.get_auth_university_id() AND author_id = auth.uid()
);

DROP POLICY IF EXISTS "answers_update_own" ON public.answers;
CREATE POLICY "answers_update_own" ON public.answers FOR UPDATE TO authenticated USING (
  author_id = auth.uid() AND university_id = public.get_auth_university_id()
) WITH CHECK (
  author_id = auth.uid() AND university_id = public.get_auth_university_id()
);

-- ==============================================================================
-- 4. SEARCH RPC FUNCTION (pg_trgm)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.search_similar_doubts(
  search_query TEXT,
  similarity_threshold REAL DEFAULT 0.2,
  match_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  university_id UUID,
  community_id UUID,
  author_id UUID,
  title TEXT,
  body TEXT,
  status public.doubt_status,
  bounty_amount INTEGER,
  net_score INTEGER,
  created_at TIMESTAMPTZ,
  similarity REAL
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  current_university_id UUID;
BEGIN
  current_university_id := public.get_auth_university_id();

  RETURN QUERY
  SELECT
    d.id,
    d.university_id,
    d.community_id,
    d.author_id,
    d.title,
    d.body,
    d.status,
    d.bounty_amount,
    d.net_score,
    d.created_at,
    similarity(d.title, search_query)::REAL AS similarity
  FROM public.doubts d
  WHERE
    (current_university_id IS NULL OR d.university_id = current_university_id)
    AND similarity(d.title, search_query) >= similarity_threshold
  ORDER BY similarity DESC, d.net_score DESC, d.created_at DESC
  LIMIT match_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_similar_doubts(TEXT, REAL, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_similar_doubts(TEXT, REAL, INTEGER) TO service_role;

-- ==============================================================================
-- 5. AUTH ONBOARDING TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  raw_domain TEXT;
  user_domain TEXT;
  matched_university_id UUID;
  user_name TEXT;
  user_avatar TEXT;
BEGIN
  IF NEW.email IS NULL OR position('@' in NEW.email) = 0 THEN
    RAISE EXCEPTION 'Signup rejected: A valid email address is required.' USING ERRCODE = '22000';
  END IF;

  raw_domain := split_part(NEW.email, '@', 2);
  user_domain := lower(trim(raw_domain));

  SELECT id INTO matched_university_id
  FROM public.universities
  WHERE (
    user_domain = ANY(allowed_domains)
    OR ('@' || user_domain) = ANY(allowed_domains)
    OR EXISTS (
      SELECT 1 FROM unnest(allowed_domains) AS d WHERE lower(trim(leading '@' from d)) = user_domain
    )
  ) LIMIT 1;

  IF matched_university_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Email domain "%" is not registered with any partner university tenant.', user_domain
      USING ERRCODE = 'P0001',
            DETAIL = 'Doubt Chain is a closed academic platform. Signups are strictly limited to active institutional email addresses.',
            HINT = 'Please register using your official university email (e.g., student@university.edu).';
  END IF;

  user_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  user_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  INSERT INTO public.profiles (
    id, university_id, name, email, role, reputation, badges, avatar_url
  ) VALUES (
    NEW.id, matched_university_id, user_name, lower(NEW.email), 'STUDENT', 0, '{}', user_avatar
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 6. GAMIFICATION ENGINE (VOTES & BOUNTIES)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_answer_vote()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_upvotes INTEGER := 0;
  new_upvotes INTEGER := 0;
  old_downvotes INTEGER := 0;
  new_downvotes INTEGER := 0;
  upvote_delta INTEGER := 0;
  downvote_delta INTEGER := 0;
  reputation_change INTEGER := 0;
BEGIN
  new_upvotes := COALESCE(cardinality(NEW.upvoted_by), 0);
  new_downvotes := COALESCE(cardinality(NEW.downvoted_by), 0);

  IF TG_OP = 'UPDATE' THEN
    old_upvotes := COALESCE(cardinality(OLD.upvoted_by), 0);
    old_downvotes := COALESCE(cardinality(OLD.downvoted_by), 0);
  END IF;

  NEW.net_score := new_upvotes - new_downvotes;
  upvote_delta := new_upvotes - old_upvotes;
  downvote_delta := new_downvotes - old_downvotes;
  reputation_change := (upvote_delta * 10) + (downvote_delta * -2);

  IF reputation_change <> 0 THEN
    UPDATE public.profiles
    SET reputation = GREATEST(0, reputation + reputation_change), updated_at = timezone('utc'::text, now())
    WHERE id = NEW.author_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_answer_votes ON public.answers;
CREATE TRIGGER trg_answer_votes BEFORE INSERT OR UPDATE OF upvoted_by, downvoted_by ON public.answers FOR EACH ROW EXECUTE FUNCTION public.handle_answer_vote();

CREATE OR REPLACE FUNCTION public.handle_accepted_answer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  parent_doubt RECORD;
  doubt_bounty INTEGER := 0;
  total_bonus INTEGER := 0;
BEGIN
  SELECT id, author_id, bounty_amount, status INTO parent_doubt FROM public.doubts WHERE id = NEW.doubt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent doubt % not found for answer %', NEW.doubt_id, NEW.id;
  END IF;

  doubt_bounty := COALESCE(parent_doubt.bounty_amount, 0);
  total_bonus := doubt_bounty + 15;

  IF NEW.is_accepted = true AND (OLD.is_accepted IS DISTINCT FROM true) THEN
    IF auth.uid() IS NOT NULL AND auth.uid() <> parent_doubt.author_id THEN
      RAISE EXCEPTION 'Unauthorized: Only the author of the doubt can accept an answer.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.answers SET is_accepted = false, updated_at = timezone('utc'::text, now())
    WHERE doubt_id = NEW.doubt_id AND id <> NEW.id AND is_accepted = true;

    UPDATE public.profiles SET reputation = reputation + total_bonus, updated_at = timezone('utc'::text, now())
    WHERE id = NEW.author_id;

    UPDATE public.doubts SET status = 'RESOLVED', resolved_answer_id = NEW.id, updated_at = timezone('utc'::text, now())
    WHERE id = NEW.doubt_id;

  ELSIF NEW.is_accepted = false AND OLD.is_accepted = true THEN
    UPDATE public.profiles SET reputation = GREATEST(0, reputation - total_bonus), updated_at = timezone('utc'::text, now())
    WHERE id = NEW.author_id;

    UPDATE public.doubts SET
      status = CASE WHEN bounty_amount > 0 THEN 'BOUNTIED'::public.doubt_status ELSE 'OPEN'::public.doubt_status END,
      resolved_answer_id = NULL,
      updated_at = timezone('utc'::text, now())
    WHERE id = NEW.doubt_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accepted_answer ON public.answers;
CREATE TRIGGER trg_accepted_answer AFTER UPDATE OF is_accepted ON public.answers FOR EACH ROW WHEN (NEW.is_accepted IS DISTINCT FROM OLD.is_accepted) EXECUTE FUNCTION public.handle_accepted_answer();

-- ==============================================================================
-- 7. SEED INITIAL UNIVERSITY (SRM UNIVERSITY)
-- ==============================================================================
INSERT INTO public.universities (name, allowed_domains)
VALUES ('SRM University', ARRAY['srmist.edu.in', 'srm.edu'])
ON CONFLICT DO NOTHING;
