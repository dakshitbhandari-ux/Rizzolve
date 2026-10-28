-- ==============================================================================
-- Migration: 002_search_rpc.sql
-- Description: Stored Procedure (RPC) for fuzzy duplicate doubt detection
-- Technology: PostgreSQL pg_trgm (Trigram Matching)
-- Multi-Tenancy: Scoped strictly to the caller's university_id via get_auth_university_id()
-- ==============================================================================

-- Ensure pg_trgm extension is available
CREATE EXTENSION IF NOT EXISTS pg_trgm;

/**
 * search_similar_doubts
 * 
 * Performs fast trigram-based fuzzy text matching against existing doubt titles
 * in the same university. Designed for real-time "search-before-posting" to prevent
 * duplicate questions.
 *
 * Parameters:
 *   - search_query (TEXT): The user's typed title/query.
 *   - similarity_threshold (REAL, optional): Minimum trigram similarity (0.0 to 1.0). Default: 0.2.
 *   - match_limit (INTEGER, optional): Maximum number of ranked results. Default: 10.
 *
 * Returns:
 *   Table of matched doubts including their similarity score.
 */
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
  -- 1. Identify the caller's university tenant
  current_university_id := public.get_auth_university_id();

  -- 2. Return ranked doubts matching the trigram threshold within the caller's university
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
    -- Tenant isolation: Limit search results to caller's university
    (current_university_id IS NULL OR d.university_id = current_university_id)
    -- Fuzzy similarity filter utilizing idx_doubts_title_trgm
    AND similarity(d.title, search_query) >= similarity_threshold
  ORDER BY
    similarity DESC,
    d.net_score DESC,
    d.created_at DESC
  LIMIT match_limit;
END;
$$;

-- Grant execution to authenticated users and backend service role
GRANT EXECUTE ON FUNCTION public.search_similar_doubts(TEXT, REAL, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_similar_doubts(TEXT, REAL, INTEGER) TO service_role;
