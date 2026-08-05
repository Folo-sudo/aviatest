-- Security hardening: restrict RPC execution to explicitly granted roles.
-- Run last, after every other schema-*.sql file.

begin;

-- Supabase grants EXECUTE to anon by default. Remove that broad access from
-- every existing function, including SECURITY DEFINER functions.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

-- Keep future application functions created by postgres private by default.
-- Grant access explicitly per RPC.
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon;

-- This lookup is intentionally public because the signup form calls it before
-- the user has an authenticated session.
grant execute on function public.is_username_available(text) to anon, authenticated;

commit;
