-- Prevent an authenticated account without a provisioned campus profile
-- from executing an unscoped doubt search under SECURITY DEFINER.

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
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  current_university_id UUID;
BEGIN
  current_university_id := public.get_auth_university_id();

  -- Fail closed: never return records when there is no authenticated tenant.
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
    similarity(d.title, search_query)::REAL AS similarity
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
