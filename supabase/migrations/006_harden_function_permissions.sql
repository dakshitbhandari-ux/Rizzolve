-- Harden execution permissions for internal SECURITY DEFINER routines.
-- Trigger functions are invoked by Postgres triggers; client roles do not need
-- direct EXECUTE privileges on them.

ALTER FUNCTION public.handle_updated_at() SET search_path = public;

REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_answer_vote() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_accepted_answer() FROM PUBLIC, anon, authenticated;

-- These two functions are used by authenticated RLS policies and the doubt
-- search RPC. Do not expose them to unauthenticated callers.
REVOKE ALL ON FUNCTION public.get_auth_university_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_university_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.search_similar_doubts(TEXT, REAL, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_similar_doubts(TEXT, REAL, INTEGER) TO authenticated, service_role;
