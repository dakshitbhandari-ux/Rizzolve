-- ==============================================================================
-- Migration: 003_auth_trigger.sql
-- Description: User Onboarding & Tenant Mapping Trigger
-- Functionality:
--   1. Fires AFTER INSERT ON auth.users.
--   2. Extracts the email domain from the incoming user.
--   3. Matches against public.universities.allowed_domains.
--   4. Automatically provisions a public.profiles record with role 'STUDENT'.
--   5. Rejects registration with an EXCEPTION if the domain is not registered.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  raw_domain TEXT;
  user_domain TEXT;
  matched_university_id UUID;
  user_name TEXT;
  user_avatar TEXT;
BEGIN
  -- 1. Validate email presence
  IF NEW.email IS NULL OR position('@' in NEW.email) = 0 THEN
    RAISE EXCEPTION 'Signup rejected: A valid email address is required.'
      USING ERRCODE = '22000';
  END IF;

  -- 2. Extract and normalize domain from email address (e.g. "student@srmist.edu.in" -> "srmist.edu.in")
  raw_domain := split_part(NEW.email, '@', 2);
  user_domain := lower(trim(raw_domain));

  -- 3. Look up university tenant by allowed_domains array
  -- Handles allowed_domains entries both with or without leading '@'
  SELECT id INTO matched_university_id
  FROM public.universities
  WHERE (
    user_domain = ANY(allowed_domains)
    OR ('@' || user_domain) = ANY(allowed_domains)
    OR EXISTS (
      SELECT 1
      FROM unnest(allowed_domains) AS d
      WHERE lower(trim(leading '@' from d)) = user_domain
    )
  )
  LIMIT 1;

  -- 4. Strict multi-tenant gatekeeper: Reject registration if domain is unrecognized
  IF matched_university_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: Email domain "%" is not registered with any partner university tenant.', user_domain
      USING ERRCODE = 'P0001',
            DETAIL = 'Doubt Chain is a closed academic platform. Signups are strictly limited to active institutional email addresses.',
            HINT = 'Please register using your official university email (e.g., student@university.edu).';
  END IF;

  -- 5. Extract user's full name from raw_user_meta_data or fallback to email prefix
  user_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  -- 6. Extract avatar URL if provided during OAuth / signup
  user_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  -- 7. Automatically provision profile record linked to auth.users
  INSERT INTO public.profiles (
    id,
    university_id,
    name,
    email,
    role,
    reputation,
    badges,
    avatar_url
  ) VALUES (
    NEW.id,
    matched_university_id,
    user_name,
    lower(NEW.email),
    'STUDENT',
    0,
    '{}',
    user_avatar
  );

  RETURN NEW;
END;
$$;

-- Drop trigger if it already exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Attach trigger to auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
