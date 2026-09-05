/*
# Yevox Core Schema

## Overview
Creates the complete data model for Yevox, a social platform where statements
earn public discussion through a voting phase before debate (Turbo) opens.

## New Tables
- `categories` — statement categories (Politics, Environment, etc.) with icon/color/order.
- `profiles` — public user profile data (display name, Yevox ID, country, city, role).
- `statements` — user-submitted declarations with hidden reasoning, lifecycle states.
- `votes` — agree/disagree votes on live/turbo statements (one per user, changeable).
- `comments` — threaded discussion (max depth 4), only after Turbo, with Fuel/Drag totals.
- `comment_ratings` — individual Fuel/Drag ratings on comments (one per user per comment).
- `notifications` — user notifications (Turbo reached, replies, stalled, etc.).
- `reports` — user reports of statements/comments for moderation.
- `audit_log` — permanent log of admin actions.
- `platform_settings` — key/value store for admin-configurable thresholds, durations, CMS.
- `announcements` — site-wide dismissible banners.
- `feature_flags` — toggle features on/off.
- `informational_pages` — editable About/Privacy/etc. rich-text pages.

## Lifecycle
Statement.status in {draft, live, turbo, archive, stalled, removed}.
- live: collecting votes, reasoning hidden, comments disabled.
- turbo: reasoning revealed, comments open, highly visible.
- archive: after 14 days in Turbo, permanent record.
- stalled: failed to reach Turbo within 30 days.

## Security (RLS)
- RLS enabled on every table.
- Authenticated users can read most public content; writes are owner-scoped.
- Admins (profiles.role = 'admin') get elevated access via policies using is_admin().
- anon may read live/turbo/archive statements and categories (public browsing),
  but all writes require authentication.
- is_admin() is declared as a stub first (returns false) so every policy that
  references it resolves at creation time, then redefined with its real body
  after the profiles table exists. Policies call the function by name at
  runtime, so the replacement makes them work correctly.
- Votes/comments are owner-scoped; duplicate-vote prevention via unique constraints.
- Email verification gate handled at app layer (auth.users email_confirmed_at).
*/

-- ============================================================================
-- Stub is_admin() — replaced with the real body after profiles exists.
-- This lets every admin-scoped policy resolve at creation time.
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$ select false; $$;

-- ============================================================================
-- categories
-- ============================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  color text,
  sort_order int not null default 0,
  is_disabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "categories_read_all" on public.categories;
create policy "categories_read_all"
  on public.categories for select
  to anon, authenticated using (true);

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write"
  on public.categories for insert
  to authenticated with check (public.is_admin());

drop policy if exists "categories_admin_update" on public.categories;
create policy "categories_admin_update"
  on public.categories for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete"
  on public.categories for delete
  to authenticated using (public.is_admin());

-- ============================================================================
-- profiles  (1:1 with auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  yevox_id text not null unique,
  country text not null,
  city text not null,
  role text not null default 'user' check (role in ('user','moderator','admin')),
  city_changed_at timestamptz,
  avatar_url text,
  total_fuel int not null default 0,
  total_drag int not null default 0,
  is_suspended boolean not null default false,
  is_banned boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all"
  on public.profiles for select
  to anon, authenticated using (deleted_at is null);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
  on public.profiles for update
  to authenticated using (public.is_admin()) with check (true);

-- ============================================================================
-- Real is_admin() — now profiles exists.
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ============================================================================
-- statements
-- ============================================================================
create table if not exists public.statements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  reasoning text not null,
  category_id uuid references public.categories(id) on delete set null,
  scope text not null check (scope in ('city','country','global')),
  scope_country text,
  scope_city text,
  status text not null default 'live' check (status in ('draft','live','turbo','archive','stalled','removed')),
  agree_count int not null default 0,
  disagree_count int not null default 0,
  total_votes int not null default 0,
  comment_count int not null default 0,
  vote_velocity float not null default 0,
  turbo_at timestamptz,
  archive_at timestamptz,
  stalled_at timestamptz,
  live_until timestamptz,
  removed_at timestamptz,
  removed_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_statements_status on public.statements(status);
create index if not exists idx_statements_author on public.statements(author_id);
create index if not exists idx_statements_category on public.statements(category_id);
create index if not exists idx_statements_scope on public.statements(scope, scope_country, scope_city);
create index if not exists idx_statements_created on public.statements(created_at desc);
create index if not exists idx_statements_velocity on public.statements(vote_velocity desc);

alter table public.statements enable row level security;

drop policy if exists "statements_read_public" on public.statements;
create policy "statements_read_public"
  on public.statements for select
  to anon, authenticated
  using (status not in ('draft','removed') or public.is_admin() or auth.uid() = author_id);

drop policy if exists "statements_insert_own" on public.statements;
create policy "statements_insert_own"
  on public.statements for insert
  to authenticated with check (auth.uid() = author_id);

drop policy if exists "statements_update_own" on public.statements;
create policy "statements_update_own"
  on public.statements for update
  to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "statements_update_admin" on public.statements;
create policy "statements_update_admin"
  on public.statements for update
  to authenticated using (public.is_admin()) with check (true);

drop policy if exists "statements_delete_own" on public.statements;
create policy "statements_delete_own"
  on public.statements for delete
  to authenticated using (auth.uid() = author_id);

drop policy if exists "statements_delete_admin" on public.statements;
create policy "statements_delete_admin"
  on public.statements for delete
  to authenticated using (public.is_admin());

-- ============================================================================
-- votes  (one vote per user per statement; value = agree/disagree)
-- ============================================================================
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.statements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value text not null check (value in ('agree','disagree')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (statement_id, user_id)
);

create index if not exists idx_votes_statement on public.votes(statement_id);
create index if not exists idx_votes_user on public.votes(user_id);

alter table public.votes enable row level security;

drop policy if exists "votes_read_all" on public.votes;
create policy "votes_read_all"
  on public.votes for select
  to anon, authenticated using (true);

drop policy if exists "votes_insert_own" on public.votes;
create policy "votes_insert_own"
  on public.votes for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "votes_update_own" on public.votes;
create policy "votes_update_own"
  on public.votes for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "votes_delete_own" on public.votes;
create policy "votes_delete_own"
  on public.votes for delete
  to authenticated using (auth.uid() = user_id);

-- ============================================================================
-- comments  (threaded, max depth 4, only when statement in turbo/archive)
-- ============================================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.statements(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  depth int not null default 0,
  body text not null,
  fuel_count int not null default 0,
  drag_count int not null default 0,
  is_deleted boolean not null default false,
  is_removed boolean not null default false,
  removed_reason text,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_statement on public.comments(statement_id);
create index if not exists idx_comments_parent on public.comments(parent_id);
create index if not exists idx_comments_author on public.comments(author_id);
create index if not exists idx_comments_fuel on public.comments(fuel_count desc);

alter table public.comments enable row level security;

drop policy if exists "comments_read_all" on public.comments;
create policy "comments_read_all"
  on public.comments for select
  to anon, authenticated using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
  on public.comments for insert
  to authenticated with check (auth.uid() = author_id);

drop policy if exists "comments_update_own_window" on public.comments;
create policy "comments_update_own_window"
  on public.comments for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "comments_update_admin" on public.comments;
create policy "comments_update_admin"
  on public.comments for update
  to authenticated using (public.is_admin()) with check (true);

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
  on public.comments for delete
  to authenticated using (auth.uid() = author_id);

drop policy if exists "comments_delete_admin" on public.comments;
create policy "comments_delete_admin"
  on public.comments for delete
  to authenticated using (public.is_admin());

-- ============================================================================
-- comment_ratings  (Fuel/Drag: one rating per user per comment)
-- ============================================================================
create table if not exists public.comment_ratings (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating text not null check (rating in ('fuel','drag')),
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create index if not exists idx_ratings_comment on public.comment_ratings(comment_id);

alter table public.comment_ratings enable row level security;

drop policy if exists "ratings_read_all" on public.comment_ratings;
create policy "ratings_read_all"
  on public.comment_ratings for select
  to anon, authenticated using (true);

drop policy if exists "ratings_insert_own" on public.comment_ratings;
create policy "ratings_insert_own"
  on public.comment_ratings for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "ratings_delete_own" on public.comment_ratings;
create policy "ratings_delete_own"
  on public.comment_ratings for delete
  to authenticated using (auth.uid() = user_id);

-- ============================================================================
-- notifications
-- ============================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notif_read_own" on public.notifications;
create policy "notif_read_own"
  on public.notifications for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "notif_insert_own_or_admin" on public.notifications;
create policy "notif_insert_own_or_admin"
  on public.notifications for insert
  to authenticated with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "notif_update_own" on public.notifications;
create policy "notif_update_own"
  on public.notifications for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notif_delete_own" on public.notifications;
create policy "notif_delete_own"
  on public.notifications for delete
  to authenticated using (auth.uid() = user_id);

drop policy if exists "notif_admin_delete" on public.notifications;
create policy "notif_admin_delete"
  on public.notifications for delete
  to authenticated using (public.is_admin());

-- ============================================================================
-- reports
-- ============================================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('statement','comment','user')),
  target_id uuid not null,
  reason text not null,
  detail text,
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  decision text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_status on public.reports(status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports_insert_authed" on public.reports;
create policy "reports_insert_authed"
  on public.reports for insert
  to authenticated with check (auth.uid() = reporter_id);

drop policy if exists "reports_read_admin" on public.reports;
create policy "reports_read_admin"
  on public.reports for select
  to authenticated using (public.is_admin() or auth.uid() = reporter_id);

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
  on public.reports for update
  to authenticated using (public.is_admin()) with check (true);

-- ============================================================================
-- audit_log
-- ============================================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  target_type text,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_admin on public.audit_log(admin_id, created_at desc);
create index if not exists idx_audit_created on public.audit_log(created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists "audit_read_admin" on public.audit_log;
create policy "audit_read_admin"
  on public.audit_log for select
  to authenticated using (public.is_admin());

drop policy if exists "audit_insert_admin" on public.audit_log;
create policy "audit_insert_admin"
  on public.audit_log for insert
  to authenticated with check (public.is_admin());

-- ============================================================================
-- platform_settings  (key/value store)
-- ============================================================================
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

drop policy if exists "settings_read_all" on public.platform_settings;
create policy "settings_read_all"
  on public.platform_settings for select
  to anon, authenticated using (true);

drop policy if exists "settings_write_admin" on public.platform_settings;
create policy "settings_write_admin"
  on public.platform_settings for insert
  to authenticated with check (public.is_admin());

drop policy if exists "settings_update_admin" on public.platform_settings;
create policy "settings_update_admin"
  on public.platform_settings for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings_delete_admin" on public.platform_settings;
create policy "settings_delete_admin"
  on public.platform_settings for delete
  to authenticated using (public.is_admin());

-- ============================================================================
-- announcements
-- ============================================================================
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  icon text,
  color text,
  start_at timestamptz not null default now(),
  end_at timestamptz,
  is_dismissible boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "ann_read_active" on public.announcements;
create policy "ann_read_active"
  on public.announcements for select
  to anon, authenticated using (true);

drop policy if exists "ann_admin_write" on public.announcements;
create policy "ann_admin_write"
  on public.announcements for insert
  to authenticated with check (public.is_admin());

drop policy if exists "ann_admin_update" on public.announcements;
create policy "ann_admin_update"
  on public.announcements for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ann_admin_delete" on public.announcements;
create policy "ann_admin_delete"
  on public.announcements for delete
  to authenticated using (public.is_admin());

-- ============================================================================
-- feature_flags
-- ============================================================================
create table if not exists public.feature_flags (
  key text primary key,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

drop policy if exists "flags_read_all" on public.feature_flags;
create policy "flags_read_all"
  on public.feature_flags for select
  to anon, authenticated using (true);

drop policy if exists "flags_write_admin" on public.feature_flags;
create policy "flags_write_admin"
  on public.feature_flags for insert
  to authenticated with check (public.is_admin());

drop policy if exists "flags_update_admin" on public.feature_flags;
create policy "flags_update_admin"
  on public.feature_flags for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- informational_pages
-- ============================================================================
create table if not exists public.informational_pages (
  slug text primary key,
  title text not null,
  content text not null,
  updated_at timestamptz not null default now()
);

alter table public.informational_pages enable row level security;

drop policy if exists "pages_read_all" on public.informational_pages;
create policy "pages_read_all"
  on public.informational_pages for select
  to anon, authenticated using (true);

drop policy if exists "pages_write_admin" on public.informational_pages;
create policy "pages_write_admin"
  on public.informational_pages for insert
  to authenticated with check (public.is_admin());

drop policy if exists "pages_update_admin" on public.informational_pages;
create policy "pages_update_admin"
  on public.informational_pages for update
  to authenticated using (public.is_admin()) with check (public.is_admin());
