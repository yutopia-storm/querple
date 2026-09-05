/*
# Seed Geographic Data: UK + US

Populates geo_countries, geo_regions, geo_local_areas with a starting dataset
for the United Kingdom and United States. Uses ON CONFLICT DO NOTHING so
re-running is safe.
*/

-- Countries
INSERT INTO public.geo_countries (name, iso_code, flag_emoji, has_regions, sort_order)
VALUES
  ('United Kingdom', 'GB', '🇬🇧', true, 1),
  ('United States', 'US', '🇺🇸', true, 2)
ON CONFLICT (name) DO NOTHING;

-- UK regions
INSERT INTO public.geo_regions (country_id, name, short_code, sort_order)
SELECT c.id, r.name, r.short_code, r.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('England', 'ENG', 1),
  ('Scotland', 'SCT', 2),
  ('Wales', 'WLS', 3),
  ('Northern Ireland', 'NIR', 4)
) AS r(name, short_code, sort_order) ON true
WHERE c.name = 'United Kingdom'
ON CONFLICT (country_id, name) DO NOTHING;

-- US regions
INSERT INTO public.geo_regions (country_id, name, short_code, sort_order)
SELECT c.id, r.name, r.short_code, r.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('California', 'CA', 1),
  ('New York', 'NY', 2),
  ('Texas', 'TX', 3),
  ('Florida', 'FL', 4),
  ('Illinois', 'IL', 5),
  ('Washington', 'WA', 6),
  ('Massachusetts', 'MA', 7),
  ('Oregon', 'OR', 8),
  ('Colorado', 'CO', 9),
  ('Georgia', 'GA', 10)
) AS r(name, short_code, sort_order) ON true
WHERE c.name = 'United States'
ON CONFLICT (country_id, name) DO NOTHING;

-- Local areas helper: join country -> VALUES -> region so region_name resolves.
-- UK (England)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('England', 'London', 1), ('England', 'Manchester', 2), ('England', 'Birmingham', 3),
  ('England', 'Leeds', 4), ('England', 'Liverpool', 5), ('England', 'Bristol', 6),
  ('England', 'Sheffield', 7), ('England', 'Newcastle', 8), ('England', 'Nottingham', 9),
  ('England', 'Brighton', 10)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United Kingdom'
ON CONFLICT (country_id, name) DO NOTHING;

-- UK (Scotland)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('Scotland', 'Edinburgh', 1), ('Scotland', 'Glasgow', 2), ('Scotland', 'Aberdeen', 3),
  ('Scotland', 'Dundee', 4), ('Scotland', 'Stirling', 5), ('Scotland', 'Inverness', 6)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United Kingdom'
ON CONFLICT (country_id, name) DO NOTHING;

-- UK (Wales)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('Wales', 'Cardiff', 1), ('Wales', 'Swansea', 2), ('Wales', 'Newport', 3), ('Wales', 'Wrexham', 4)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United Kingdom'
ON CONFLICT (country_id, name) DO NOTHING;

-- UK (Northern Ireland)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('Northern Ireland', 'Belfast', 1), ('Northern Ireland', 'Derry', 2),
  ('Northern Ireland', 'Lisburn', 3), ('Northern Ireland', 'Newry', 4)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United Kingdom'
ON CONFLICT (country_id, name) DO NOTHING;

-- US (California)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('California', 'Los Angeles', 1), ('California', 'San Francisco', 2),
  ('California', 'San Diego', 3), ('California', 'Sacramento', 4), ('California', 'San Jose', 5)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United States'
ON CONFLICT (country_id, name) DO NOTHING;

-- US (New York)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('New York', 'New York City', 1), ('New York', 'Buffalo', 2),
  ('New York', 'Rochester', 3), ('New York', 'Albany', 4)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United States'
ON CONFLICT (country_id, name) DO NOTHING;

-- US (Texas)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('Texas', 'Houston', 1), ('Texas', 'Dallas', 2), ('Texas', 'Austin', 3), ('Texas', 'San Antonio', 4)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United States'
ON CONFLICT (country_id, name) DO NOTHING;

-- US (Florida)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('Florida', 'Miami', 1), ('Florida', 'Orlando', 2), ('Florida', 'Tampa', 3), ('Florida', 'Jacksonville', 4)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United States'
ON CONFLICT (country_id, name) DO NOTHING;

-- US (Illinois)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('Illinois', 'Chicago', 1), ('Illinois', 'Springfield', 2), ('Illinois', 'Naperville', 3)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United States'
ON CONFLICT (country_id, name) DO NOTHING;

-- US (Washington)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('Washington', 'Seattle', 1), ('Washington', 'Spokane', 2), ('Washington', 'Tacoma', 3)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United States'
ON CONFLICT (country_id, name) DO NOTHING;

-- US (Massachusetts)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('Massachusetts', 'Boston', 1), ('Massachusetts', 'Cambridge', 2), ('Massachusetts', 'Worcester', 3)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United States'
ON CONFLICT (country_id, name) DO NOTHING;

-- US (Oregon)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('Oregon', 'Portland', 1), ('Oregon', 'Eugene', 2), ('Oregon', 'Salem', 3)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United States'
ON CONFLICT (country_id, name) DO NOTHING;

-- US (Colorado)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('Colorado', 'Denver', 1), ('Colorado', 'Boulder', 2), ('Colorado', 'Colorado Springs', 3)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United States'
ON CONFLICT (country_id, name) DO NOTHING;

-- US (Georgia)
INSERT INTO public.geo_local_areas (country_id, region_id, name, sort_order)
SELECT c.id, rg.id, la.name, la.sort_order
FROM public.geo_countries c
JOIN (VALUES
  ('Georgia', 'Atlanta', 1), ('Georgia', 'Savannah', 2), ('Georgia', 'Augusta', 3)
) AS la(region_name, name, sort_order) ON true
JOIN public.geo_regions rg ON rg.country_id = c.id AND rg.name = la.region_name
WHERE c.name = 'United States'
ON CONFLICT (country_id, name) DO NOTHING;
