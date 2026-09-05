/*
# Security Hardening

## Overview
Fixes three categories of security findings:
1. Function search_path mutable — all SECURITY DEFINER functions now pin
   `set search_path = public, pg_temp` to prevent search_path injection.
2. RLS policies with always-true WITH CHECK — admin update policies on
   comments, statements, profiles, and reports now require `is_admin()` in
   both USING and WITH CHECK. Geo table write policies now require `is_admin()`
   instead of allowing any authenticated user to modify reference data.
3. Public/authenticated can execute SECURITY DEFINER functions via REST —
   EXECUTE revoked from anon and authenticated on all internal trigger/helper
   functions. `sweep_lifecycle` is now called internally by the vote trigger
   instead of via REST RPC, so its execute is revoked too. `is_admin()` keeps
   execute for anon and authenticated because RLS policies reference it at
   evaluation time and would error without the privilege.

## Functions Modified (search_path pinned)
- `is_admin()` — search_path added. EXECUTE kept for anon+authenticated (RLS dependency).
- `recalc_statement_vote_counts(uuid)` — search_path added. EXECUTE revoked.
- `recompute_vote_velocity(uuid)` — search_path added. EXECUTE revoked.
- `check_turbo_promotion(uuid)` — search_path added. EXECUTE revoked.
- `tg_votes_changed()` — search_path added. EXECUTE revoked. Now calls sweep_lifecycle() internally.
- `recalc_comment_rating_counts(uuid)` — search_path added. EXECUTE revoked.
- `tg_ratings_changed()` — search_path added. EXECUTE revoked.
- `tg_comments_changed()` — search_path added. EXECUTE revoked.
- `sweep_lifecycle()` — search_path added. EXECUTE revoked from anon+authenticated.

## RLS Policies Fixed
- `profiles_admin_update` — WITH CHECK (true) → WITH CHECK (public.is_admin())
- `statements_update_admin` — WITH CHECK (true) → WITH CHECK (public.is_admin())
- `comments_update_admin` — WITH CHECK (true) → WITH CHECK (public.is_admin())
- `reports_update_admin` — WITH CHECK (true) → WITH CHECK (public.is_admin())
- `geo_countries_write_auth` — WITH CHECK (true) → WITH CHECK (public.is_admin())
- `geo_countries_update_auth` — USING+CHECK (true) → USING+CHECK (public.is_admin())
- `geo_countries_delete_auth` — USING (true) → USING (public.is_admin())
- `geo_regions_write_auth` — same pattern
- `geo_regions_update_auth` — same pattern
- `geo_regions_delete_auth` — same pattern
- `geo_local_areas_write_auth` — same pattern
- `geo_local_areas_update_auth` — same pattern
- `geo_local_areas_delete_auth` — same pattern

## Notes
1. `is_admin()` must remain executable by anon and authenticated because RLS
   policies (e.g. statements_read_public) reference it during policy evaluation.
   Revoking would cause `permission denied for function is_admin` on every query.
   The function is safe to expose: it only returns a boolean derived from
   auth.uid() and the profiles table — no data is disclosed or modified.
2. Trigger functions (tg_*) don't require EXECUTE privilege when fired by
   triggers — the trigger system invokes them regardless of role grants.
3. `sweep_lifecycle()` is now called inside `tg_votes_changed()` so lifecycle
   transitions (turbo→archive, live→stalled) happen opportunistically on vote
   activity without needing a REST-exposed RPC endpoint.
*/

-- ============================================================================
-- 1. Redefine is_admin() with pinned search_path
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ============================================================================
-- 2. Redefine recalc_statement_vote_counts with pinned search_path
-- ============================================================================
create or replace function public.recalc_statement_vote_counts(s_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.statements s set
    agree_count = coalesce((select count(*) from public.votes v where v.statement_id = s_id and v.value = 'agree'), 0),
    disagree_count = coalesce((select count(*) from public.votes v where v.statement_id = s_id and v.value = 'disagree'), 0),
    total_votes = coalesce((select count(*) from public.votes v where v.statement_id = s_id), 0)
  where s.id = s_id;
end;
$$;

-- ============================================================================
-- 3. Redefine recompute_vote_velocity with pinned search_path
-- ============================================================================
create or replace function public.recompute_vote_velocity(s_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  hrs float;
  tv int;
begin
  select total_votes, extract(epoch from (now() - created_at)) / 3600.0
    into tv, hrs
  from public.statements where id = s_id;
  if tv is null then return; end if;
  if hrs < 1.0 then hrs := 1.0; end if;
  update public.statements set vote_velocity = (tv / hrs) where id = s_id;
end;
$$;

-- ============================================================================
-- 4. Redefine check_turbo_promotion with pinned search_path
-- ============================================================================
create or replace function public.check_turbo_promotion(s_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s_status text;
  s_total int;
  s_author uuid;
  thr int;
  thr_val jsonb;
begin
  select status, total_votes, author_id into s_status, s_total, s_author
  from public.statements where id = s_id;
  if s_status is null then return; end if;

  select value into thr_val from public.platform_settings where key = 'turbo_threshold';
  thr := coalesce((thr_val->>'value')::int, 50);

  if s_status = 'live' and s_total >= thr then
    update public.statements set
      status = 'turbo',
      turbo_at = now(),
      live_until = null,
      archive_at = now() + interval '14 days'
    where id = s_id;
    insert into public.notifications (user_id, type, title, body, link, related_id)
    values (s_author, 'turbo', 'Your statement reached Turbo',
            'Your statement earned enough votes to enter discussion. Reasoning is now public.',
            '/statement/' || s_id::text, s_id);
  end if;
end;
$$;

-- ============================================================================
-- 5. Redefine sweep_lifecycle with pinned search_path
-- ============================================================================
create or replace function public.sweep_lifecycle()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Turbo -> Archive after 14 days
  update public.statements set
    status = 'archive',
    archive_at = now()
  where status = 'turbo' and archive_at is not null and now() >= archive_at;

  -- Live -> Stalled after live_until (30 days from creation default)
  update public.statements set
    status = 'stalled',
    stalled_at = now()
  where status = 'live' and live_until is not null and now() >= live_until;
end;
$$;

-- ============================================================================
-- 6. Redefine tg_votes_changed with pinned search_path + embedded sweep
-- ============================================================================
create or replace function public.tg_votes_changed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.recalc_statement_vote_counts(coalesce(new.statement_id, old.statement_id));
  perform public.recompute_vote_velocity(coalesce(new.statement_id, old.statement_id));
  perform public.check_turbo_promotion(coalesce(new.statement_id, old.statement_id));
  -- Opportunistic lifecycle sweep on every vote activity
  perform public.sweep_lifecycle();
  return coalesce(new, old);
end;
$$;

-- ============================================================================
-- 7. Redefine recalc_comment_rating_counts with pinned search_path
-- ============================================================================
create or replace function public.recalc_comment_rating_counts(c_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.comments c set
    fuel_count = coalesce((select count(*) from public.comment_ratings r where r.comment_id = c_id and r.rating = 'fuel'), 0),
    drag_count = coalesce((select count(*) from public.comment_ratings r where r.comment_id = c_id and r.rating = 'drag'), 0)
  where c.id = c_id;
end;
$$;

-- ============================================================================
-- 8. Redefine tg_ratings_changed with pinned search_path
-- ============================================================================
create or replace function public.tg_ratings_changed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_author uuid;
begin
  if (tg_op = 'INSERT') then
    perform public.recalc_comment_rating_counts(new.comment_id);
    select author_id into c_author from public.comments where id = new.comment_id;
    if c_author is not null then
      if new.rating = 'fuel' then
        update public.profiles set total_fuel = total_fuel + 1 where id = c_author;
      else
        update public.profiles set total_drag = total_drag + 1 where id = c_author;
      end if;
    end if;
    return new;
  elsif (tg_op = 'DELETE') then
    perform public.recalc_comment_rating_counts(old.comment_id);
    select author_id into c_author from public.comments where id = old.comment_id;
    if c_author is not null then
      if old.rating = 'fuel' then
        update public.profiles set total_fuel = greatest(total_fuel - 1, 0) where id = c_author;
      else
        update public.profiles set total_drag = greatest(total_drag - 1, 0) where id = c_author;
      end if;
    end if;
    return old;
  end if;
  return null;
end;
$$;

-- ============================================================================
-- 9. Redefine tg_comments_changed with pinned search_path
-- ============================================================================
create or replace function public.tg_comments_changed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_author uuid;
  stmt_author uuid;
  stmt_id uuid;
begin
  if (tg_op = 'INSERT') then
    stmt_id := new.statement_id;
    update public.statements set comment_count = comment_count + 1 where id = stmt_id;
    if new.parent_id is not null then
      select author_id into parent_author from public.comments where id = new.parent_id;
      if parent_author is not null and parent_author <> new.author_id then
        insert into public.notifications (user_id, type, title, body, link, related_id)
        values (parent_author, 'reply', 'New reply to your comment',
                'Someone replied to your comment.',
                '/statement/' || stmt_id::text, new.id);
      end if;
    end if;
    return new;
  elsif (tg_op = 'DELETE') then
    stmt_id := old.statement_id;
    update public.statements set comment_count = greatest(comment_count - 1, 0) where id = stmt_id;
    return old;
  end if;
  return null;
end;
$$;

-- ============================================================================
-- 10. Revoke EXECUTE from anon and authenticated on internal functions
-- ============================================================================
revoke execute on function public.recalc_statement_vote_counts(uuid) from anon, authenticated;
revoke execute on function public.recompute_vote_velocity(uuid) from anon, authenticated;
revoke execute on function public.check_turbo_promotion(uuid) from anon, authenticated;
revoke execute on function public.tg_votes_changed() from anon, authenticated;
revoke execute on function public.recalc_comment_rating_counts(uuid) from anon, authenticated;
revoke execute on function public.tg_ratings_changed() from anon, authenticated;
revoke execute on function public.tg_comments_changed() from anon, authenticated;
revoke execute on function public.sweep_lifecycle() from anon, authenticated;

-- ============================================================================
-- 11. Fix admin RLS policies: WITH CHECK (true) → WITH CHECK (is_admin())
-- ============================================================================
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
  on public.profiles for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "statements_update_admin" on public.statements;
create policy "statements_update_admin"
  on public.statements for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "comments_update_admin" on public.comments;
create policy "comments_update_admin"
  on public.comments for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
  on public.reports for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- 12. Fix geo table write policies: require is_admin()
-- ============================================================================
drop policy if exists "geo_countries_write_auth" on public.geo_countries;
create policy "geo_countries_write_auth"
  on public.geo_countries for insert
  to authenticated with check (public.is_admin());

drop policy if exists "geo_countries_update_auth" on public.geo_countries;
create policy "geo_countries_update_auth"
  on public.geo_countries for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "geo_countries_delete_auth" on public.geo_countries;
create policy "geo_countries_delete_auth"
  on public.geo_countries for delete
  to authenticated using (public.is_admin());

drop policy if exists "geo_regions_write_auth" on public.geo_regions;
create policy "geo_regions_write_auth"
  on public.geo_regions for insert
  to authenticated with check (public.is_admin());

drop policy if exists "geo_regions_update_auth" on public.geo_regions;
create policy "geo_regions_update_auth"
  on public.geo_regions for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "geo_regions_delete_auth" on public.geo_regions;
create policy "geo_regions_delete_auth"
  on public.geo_regions for delete
  to authenticated using (public.is_admin());

drop policy if exists "geo_local_areas_write_auth" on public.geo_local_areas;
create policy "geo_local_areas_write_auth"
  on public.geo_local_areas for insert
  to authenticated with check (public.is_admin());

drop policy if exists "geo_local_areas_update_auth" on public.geo_local_areas;
create policy "geo_local_areas_update_auth"
  on public.geo_local_areas for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "geo_local_areas_delete_auth" on public.geo_local_areas;
create policy "geo_local_areas_delete_auth"
  on public.geo_local_areas for delete
  to authenticated using (public.is_admin());
