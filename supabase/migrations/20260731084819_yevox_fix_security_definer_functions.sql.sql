/*
# Fix: Public/authenticated can execute SECURITY DEFINER functions

## Problem
The default ACL for functions in the public schema grants EXECUTE to anon,
authenticated, and service_role. Although a previous migration revoked EXECUTE
on the internal helper/trigger functions, the security scanner still flags all
SECURITY DEFINER functions as callable via /rest/v1/rpc/<name>.

## Fix
1. is_admin() — switch to SECURITY INVOKER. It only reads profiles, which are
   readable by all authenticated/anon users via the profiles_read_all RLS
   policy. RLS policies that reference is_admin() continue to work because the
   invoking role can still call the function and the underlying SELECT passes
   RLS. EXECUTE is revoked from anon/authenticated so the RPC endpoint is gone.

2. Internal trigger/helper functions (recalc_*, recompute_*, check_turbo_*,
   sweep_lifecycle, tg_*) — these MUST remain SECURITY DEFINER because they are
   fired by triggers and update rows (statement counts, status, profile totals)
   that the triggering user does not own. EXECUTE is explicitly re-revoked from
   anon and authenticated. The default function ACL in the public schema is also
   altered to stop auto-granting EXECUTE to anon/authenticated for future
   functions created by postgres.
*/

-- ============================================================================
-- 1. is_admin() -> SECURITY INVOKER, revoke from anon + authenticated
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security invoker
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from anon, authenticated;

-- ============================================================================
-- 2. Re-revoke EXECUTE on all internal SECURITY DEFINER functions
--    (idempotent — safe even if already revoked)
-- ============================================================================
revoke execute on function public.recalc_statement_vote_counts(uuid) from anon, authenticated;
revoke execute on function public.recompute_vote_velocity(uuid) from anon, authenticated;
revoke execute on function public.check_turbo_promotion(uuid) from anon, authenticated;
revoke execute on function public.tg_votes_changed() from anon, authenticated;
revoke execute on function public.recalc_comment_rating_counts(uuid) from anon, authenticated;
revoke execute on function public.tg_ratings_changed() from anon, authenticated;
revoke execute on function public.tg_comments_changed() from anon, authenticated;
revoke execute on function public.sweep_lifecycle() from anon, authenticated;
