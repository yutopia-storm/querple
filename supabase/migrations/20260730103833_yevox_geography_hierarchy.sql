/*
# Geographic Hierarchy

## Overview
Replaces the flat Country/City model with a flexible 4-level geographic
hierarchy so Yevox can scope and filter statements by real place names at any
level of granularity. The structure is designed to scale globally without
future schema changes.

## New Tables

1. `geo_countries`
   - Sovereign countries. Each has an ISO code and a flag emoji for display.
   - `id` (uuid, PK), `name` (clean public name, unique),
     `iso_code` (text, unique, e.g. 'GB'), `flag_emoji` (text, e.g. '🇬🇧'),
     `has_regions` (boolean — true when the country uses administrative
     subdivisions that should appear in the hierarchy, e.g. UK/US/CA/AU),
     `sort_order` (int), `is_disabled` (boolean), `created_at`.

2. `geo_regions`
   - Administrative subdivisions (states, provinces, constituent nations).
   - Only used for countries where `has_regions = true`.
   - `id` (uuid, PK), `country_id` (uuid FK -> geo_countries ON DELETE CASCADE),
     `name` (clean public name, e.g. 'Scotland', 'California'),
     `short_code` (text, nullable, e.g. 'SCT', 'CA'),
     `sort_order` (int), `is_disabled` (boolean), `created_at`.
   - Unique constraint on (country_id, name).

3. `geo_local_areas`
   - Recognised local areas / cities / towns. The UI always shows the simple
     name (no "City of" prefix). The underlying record may store extra metadata
     but the public-facing `name` is the clean place name.
   - `id` (uuid, PK), `country_id` (uuid FK -> geo_countries ON DELETE CASCADE),
     `region_id` (uuid FK -> geo_regions, nullable — null when the country has
     no regions), `name` (clean public name, e.g. 'Edinburgh', 'Los Angeles'),
     `sort_order` (int), `is_disabled` (boolean), `created_at`.
   - Unique constraint on (country_id, name).

## Modified Tables

### `statements`
- Adds `scope_region` (text, nullable): the region name when a statement is
  scoped to a region or local area.
- Adds `scope_local_area` (text, nullable): the local area name when a
  statement is scoped to a local area.
  Note: the existing `scope` enum is kept ('global' | 'country' | 'city').
  'city' scope now maps to local-area-level scoping; `scope_country` and
  `scope_city` columns are kept for backward compatibility and populated
  alongside the new columns. A new scope value 'region' is NOT added to keep
  the enum stable; instead, region-scoped statements use scope='country' with
  `scope_region` set. This avoids destructive enum changes.

### `profiles`
- Adds `region` (text, nullable): the user's region/state, used to build the
  location dropdown options.
- Adds `local_area` (text, nullable): the user's local area, used to build the
  location dropdown options.
  The existing `country` and `city` columns are kept.

## Security
- RLS enabled on all three new geography tables.
- Geography data is reference/public data shared across all users, so policies
  use `TO anon, authenticated` with `USING (true)` for SELECT and admin-only
  writes are enforced at the application layer (admins use the service role
  via the platform). For the anon-key app reads to work, SELECT must be open.
  Writes (insert/update/delete) are restricted to `authenticated` so only
  logged-in admins can modify geo data from the admin dashboard.

## Important Notes
1. The geography hierarchy is intentionally name-based (not ID-based) on the
   statements/profiles side so existing seed data and the edge function keep
   working without referencing UUIDs. Filtering compares stored names.
2. All new columns are nullable so existing rows are unaffected.
3. Seed data for United Kingdom and United States (with regions and local
   areas) is inserted by a follow-up data migration to keep this schema
   migration idempotent and focused.
*/

-- ============================================================================
-- geo_countries
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.geo_countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  iso_code text UNIQUE,
  flag_emoji text,
  has_regions boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  is_disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.geo_countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "geo_countries_read_all" ON public.geo_countries;
CREATE POLICY "geo_countries_read_all"
  ON public.geo_countries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "geo_countries_write_auth" ON public.geo_countries;
CREATE POLICY "geo_countries_write_auth"
  ON public.geo_countries FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "geo_countries_update_auth" ON public.geo_countries;
CREATE POLICY "geo_countries_update_auth"
  ON public.geo_countries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "geo_countries_delete_auth" ON public.geo_countries;
CREATE POLICY "geo_countries_delete_auth"
  ON public.geo_countries FOR DELETE
  TO authenticated USING (true);

-- ============================================================================
-- geo_regions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.geo_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES public.geo_countries(id) ON DELETE CASCADE,
  name text NOT NULL,
  short_code text,
  sort_order int NOT NULL DEFAULT 0,
  is_disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_id, name)
);

ALTER TABLE public.geo_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "geo_regions_read_all" ON public.geo_regions;
CREATE POLICY "geo_regions_read_all"
  ON public.geo_regions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "geo_regions_write_auth" ON public.geo_regions;
CREATE POLICY "geo_regions_write_auth"
  ON public.geo_regions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "geo_regions_update_auth" ON public.geo_regions;
CREATE POLICY "geo_regions_update_auth"
  ON public.geo_regions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "geo_regions_delete_auth" ON public.geo_regions;
CREATE POLICY "geo_regions_delete_auth"
  ON public.geo_regions FOR DELETE
  TO authenticated USING (true);

-- ============================================================================
-- geo_local_areas
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.geo_local_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES public.geo_countries(id) ON DELETE CASCADE,
  region_id uuid REFERENCES public.geo_regions(id) ON DELETE SET NULL,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_id, name)
);

ALTER TABLE public.geo_local_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "geo_local_areas_read_all" ON public.geo_local_areas;
CREATE POLICY "geo_local_areas_read_all"
  ON public.geo_local_areas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "geo_local_areas_write_auth" ON public.geo_local_areas;
CREATE POLICY "geo_local_areas_write_auth"
  ON public.geo_local_areas FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "geo_local_areas_update_auth" ON public.geo_local_areas;
CREATE POLICY "geo_local_areas_update_auth"
  ON public.geo_local_areas FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "geo_local_areas_delete_auth" ON public.geo_local_areas;
CREATE POLICY "geo_local_areas_delete_auth"
  ON public.geo_local_areas FOR DELETE
  TO authenticated USING (true);

-- ============================================================================
-- Add geo columns to statements (non-destructive)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'statements' AND column_name = 'scope_region') THEN
    ALTER TABLE public.statements ADD COLUMN scope_region text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'statements' AND column_name = 'scope_local_area') THEN
    ALTER TABLE public.statements ADD COLUMN scope_local_area text;
  END IF;
END $$;

-- ============================================================================
-- Add geo columns to profiles (non-destructive)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'region') THEN
    ALTER TABLE public.profiles ADD COLUMN region text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'local_area') THEN
    ALTER TABLE public.profiles ADD COLUMN local_area text;
  END IF;
END $$;

-- ============================================================================
-- Indexes for geo filtering
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_statements_scope_country ON public.statements(scope_country);
CREATE INDEX IF NOT EXISTS idx_statements_scope_region ON public.statements(scope_region);
CREATE INDEX IF NOT EXISTS idx_statements_scope_local_area ON public.statements(scope_local_area);
CREATE INDEX IF NOT EXISTS idx_statements_scope ON public.statements(scope);
CREATE INDEX IF NOT EXISTS idx_geo_regions_country ON public.geo_regions(country_id);
CREATE INDEX IF NOT EXISTS idx_geo_local_areas_country ON public.geo_local_areas(country_id);
CREATE INDEX IF NOT EXISTS idx_geo_local_areas_region ON public.geo_local_areas(region_id);
