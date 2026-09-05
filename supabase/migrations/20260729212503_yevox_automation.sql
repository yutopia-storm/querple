/*
# Yevox Automation: triggers & functions

## Purpose
Automates the statement lifecycle and aggregate counters so the backend keeps
data consistent without the app re-deriving totals on every write.

## Functions
- recalc_statement_vote_counts(statement_id uuid)
    Recomputes agree_count, disagree_count, total_votes on a statement from the
    votes table. Called by triggers on votes INSERT/UPDATE/DELETE.
- recalc_comment_rating_counts(comment_id uuid)
    Recomputes fuel_count, drag_count on a comment from comment_ratings.
    Called by triggers on comment_ratings INSERT/DELETE.
- check_turbo_promotion()
    After vote counts update, if a LIVE statement has reached the turbo
    threshold (from platform_settings, default 50) it flips to 'turbo', sets
    turbo_at, live_until=null, and inserts a "reached Turbo" notification.
- recompute_vote_velocity(statement_id uuid)
    Sets vote_velocity = total_votes / hours_since_created (capped) to power
    Trending ordering.

## Triggers
- votes AFTER INSERT/UPDATE/DELETE -> recalc counts + check turbo + velocity
- comment_ratings AFTER INSERT/DELETE -> recalc comment counts; bump profile totals
- comments AFTER INSERT/DELETE -> update statement.comment_count
- profiles role change handled at app layer.

## Notes
- Functions use SECURITY DEFINER so they can read/write rows the calling user
  may not own (e.g. updating a statement's counts when a voter isn't the author).
- All triggers are idempotent-safe: recalc derives totals from the live table.
*/

-- ============================================================================
-- recalc_statement_vote_counts
-- ============================================================================
create or replace function public.recalc_statement_vote_counts(s_id uuid)
returns void
language plpgsql
security definer
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
-- recompute_vote_velocity  (votes per hour since created, min 1 to avoid div0)
-- ============================================================================
create or replace function public.recompute_vote_velocity(s_id uuid)
returns void
language plpgsql
security definer
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
-- check_turbo_promotion  (threshold from platform_settings or default 50)
-- ============================================================================
create or replace function public.check_turbo_promotion(s_id uuid)
returns void
language plpgsql
security definer
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
-- Trigger function: votes AFTER INSERT/UPDATE/DELETE
-- ============================================================================
create or replace function public.tg_votes_changed()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.recalc_statement_vote_counts(coalesce(new.statement_id, old.statement_id));
  perform public.recompute_vote_velocity(coalesce(new.statement_id, old.statement_id));
  perform public.check_turbo_promotion(coalesce(new.statement_id, old.statement_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_votes_insert on public.votes;
create trigger trg_votes_insert after insert on public.votes
  for each row execute function public.tg_votes_changed();

drop trigger if exists trg_votes_update on public.votes;
create trigger trg_votes_update after update on public.votes
  for each row execute function public.tg_votes_changed();

drop trigger if exists trg_votes_delete on public.votes;
create trigger trg_votes_delete after delete on public.votes
  for each row execute function public.tg_votes_changed();

-- ============================================================================
-- recalc_comment_rating_counts
-- ============================================================================
create or replace function public.recalc_comment_rating_counts(c_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.comments c set
    fuel_count = coalesce((select count(*) from public.comment_ratings r where r.comment_id = c_id and r.rating = 'fuel'), 0),
    drag_count = coalesce((select count(*) from public.comment_ratings r where r.comment_id = c_id and r.rating = 'drag'), 0)
  where c.id = c_id;
end;
$$;

-- ============================================================================
-- Trigger function: comment_ratings AFTER INSERT/DELETE
-- Also updates the comment author's profile total_fuel / total_drag.
-- ============================================================================
create or replace function public.tg_ratings_changed()
returns trigger
language plpgsql
security definer
as $$
declare
  c_author uuid;
  old_rating text;
  new_rating text;
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

drop trigger if exists trg_ratings_insert on public.comment_ratings;
create trigger trg_ratings_insert after insert on public.comment_ratings
  for each row execute function public.tg_ratings_changed();

drop trigger if exists trg_ratings_delete on public.comment_ratings;
create trigger trg_ratings_delete after delete on public.comment_ratings
  for each row execute function public.tg_ratings_changed();

-- ============================================================================
-- Trigger function: comments AFTER INSERT/DELETE -> statement.comment_count
-- On insert of a reply, also notify the parent comment's author.
-- ============================================================================
create or replace function public.tg_comments_changed()
returns trigger
language plpgsql
security definer
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

drop trigger if exists trg_comments_insert on public.comments;
create trigger trg_comments_insert after insert on public.comments
  for each row execute function public.tg_comments_changed();

drop trigger if exists trg_comments_delete on public.comments;
create trigger trg_comments_delete after delete on public.comments
  for each row execute function public.tg_comments_changed();

-- ============================================================================
-- Scheduled lifecycle sweep: Turbo->Archive (14d), Live->Stalled (30d).
-- Exposed as an RPC the app (or admin) can call; Supabase pg_cron could call
-- it, but we also invoke it opportunistically from the app on read.
-- ============================================================================
create or replace function public.sweep_lifecycle()
returns void
language plpgsql
security definer
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
