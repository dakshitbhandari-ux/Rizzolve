-- Rizzolve individual account onboarding.
-- Apply after migrations 001-004 in the Supabase SQL editor or with `supabase db push`.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_id TEXT,
  ADD COLUMN IF NOT EXISTS course TEXT,
  ADD COLUMN IF NOT EXISTS semester TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_unique_student_id
  ON public.profiles (university_id, lower(trim(student_id)))
  WHERE student_id IS NOT NULL AND length(trim(student_id)) > 0;

-- A default campus tenant permits onboarding before a college is explicitly
-- configured. Institutions can later be added with their own allowed_domains.
INSERT INTO public.universities (name, allowed_domains)
SELECT 'Rizzolve Open Campus', '{}'::TEXT[]
WHERE NOT EXISTS (
  SELECT 1 FROM public.universities WHERE name = 'Rizzolve Open Campus'
);

-- Replace the strict domain-only trigger from migration 003.
-- If a matching university domain exists, the user joins that tenant;
-- otherwise the user joins the default Rizzolve Open Campus tenant.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_domain TEXT;
  matched_university_id UUID;
  user_name TEXT;
  student_identifier TEXT;
  user_course TEXT;
  user_semester TEXT;
BEGIN
  IF NEW.email IS NULL OR position('@' in NEW.email) = 0 THEN
    RAISE EXCEPTION 'Signup rejected: A valid email address is required.'
      USING ERRCODE = '22000';
  END IF;

  user_domain := lower(trim(split_part(NEW.email, '@', 2)));

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
  ORDER BY created_at
  LIMIT 1;

  IF matched_university_id IS NULL THEN
    SELECT id INTO matched_university_id
    FROM public.universities
    WHERE name = 'Rizzolve Open Campus'
    LIMIT 1;

    IF matched_university_id IS NULL THEN
      INSERT INTO public.universities (name, allowed_domains)
      VALUES ('Rizzolve Open Campus', '{}'::TEXT[])
      RETURNING id INTO matched_university_id;
    END IF;
  END IF;

  user_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );
  student_identifier := NULLIF(trim(NEW.raw_user_meta_data->>'student_id'), '');
  user_course := NULLIF(trim(NEW.raw_user_meta_data->>'course'), '');
  user_semester := NULLIF(trim(NEW.raw_user_meta_data->>'semester'), '');

  INSERT INTO public.profiles (
    id, university_id, name, email, role, reputation, badges,
    student_id, course, semester
  ) VALUES (
    NEW.id, matched_university_id, user_name, lower(NEW.email), 'STUDENT', 0, '{}',
    student_identifier, user_course, user_semester
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    student_id = COALESCE(EXCLUDED.student_id, public.profiles.student_id),
    course = COALESCE(EXCLUDED.course, public.profiles.course),
    semester = COALESCE(EXCLUDED.semester, public.profiles.semester),
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;
