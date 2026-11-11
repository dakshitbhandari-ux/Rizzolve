-- Keep the SECURITY DEFINER tenant helper outside exposed API schemas.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.get_auth_university_id() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.get_auth_university_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_auth_university_id() TO authenticated, service_role;

-- pg_trgm is used by the search function and trigram index; keep extension
-- objects in the dedicated extensions schema rather than public.
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- This endpoint is a normal authenticated RPC and should obey the caller's
-- table RLS policies. The private helper reads only the caller's tenant.
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
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, private
AS $$
DECLARE
  current_university_id UUID;
BEGIN
  current_university_id := private.get_auth_university_id();
  IF current_university_id IS NULL THEN
    RETURN;
  END IF;

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
    similarity(d.title, search_query)::REAL
  FROM public.doubts d
  WHERE d.university_id = current_university_id
    AND similarity(d.title, search_query) >= similarity_threshold
  ORDER BY
    similarity DESC,
    d.net_score DESC,
    d.created_at DESC
  LIMIT LEAST(GREATEST(match_limit, 1), 20);
END;
$$;

REVOKE ALL ON FUNCTION public.search_similar_doubts(TEXT, REAL, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_similar_doubts(TEXT, REAL, INTEGER) TO authenticated, service_role;
