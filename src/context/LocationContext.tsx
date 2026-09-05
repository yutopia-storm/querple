import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { GeoCountry, GeoRegion, GeoLocalArea, LocationSelection, GeoLevel } from '@/lib/geo';
import { ALL_LOCATIONS } from '@/lib/geo';

interface LocationOption {
  level: GeoLevel;
  label: string;
  selection: LocationSelection;
}

interface LocationCtx {
  selection: LocationSelection;
  setLocation: (s: LocationSelection) => void;
  options: LocationOption[];
  loading: boolean;
  geoCountries: GeoCountry[];
  geoRegions: GeoRegion[];
  geoLocalAreas: GeoLocalArea[];
}

const LocationContext = createContext<LocationCtx | null>(null);

const STORAGE_KEY = 'yevox_location_selection';

function loadStored(): LocationSelection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocationSelection;
    if (parsed && typeof parsed.level === 'string') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [selection, setSelection] = useState<LocationSelection>(ALL_LOCATIONS);
  const [countries, setCountries] = useState<GeoCountry[]>([]);
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [localAreas, setLocalAreas] = useState<GeoLocalArea[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all geo data once
  useEffect(() => {
    let active = true;
    (async () => {
      const [cRes, rRes, laRes] = await Promise.all([
        supabase.from('geo_countries').select('*').eq('is_disabled', false).order('sort_order'),
        supabase.from('geo_regions').select('*').eq('is_disabled', false).order('sort_order'),
        supabase.from('geo_local_areas').select('*').eq('is_disabled', false).order('sort_order'),
      ]);
      if (!active) return;
      setCountries((cRes.data as GeoCountry[]) ?? []);
      setRegions((rRes.data as GeoRegion[]) ?? []);
      setLocalAreas((laRes.data as GeoLocalArea[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Restore previous selection from localStorage (once geo data is loaded)
  useEffect(() => {
    if (loading) return;
    const stored = loadStored();
    if (stored) {
      // Validate against loaded data; reset if country no longer exists
      if (stored.country && !countries.some((c) => c.name === stored.country)) {
        setSelection(ALL_LOCATIONS);
      } else {
        setSelection(stored);
      }
    }
    // Only run when geo data first loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Default to the user's own location when they log in and no stored choice exists
  useEffect(() => {
    if (loading || !profile) return;
    const stored = loadStored();
    if (stored) return;
    if (profile.local_area || profile.region || profile.country) {
      const defaultSel: LocationSelection = {
        level: profile.local_area
          ? 'local_area'
          : profile.region
            ? 'region'
            : 'country',
        country: profile.country ?? null,
        region: profile.region ?? null,
        localArea: profile.local_area ?? profile.city ?? null,
      };
      setSelection(defaultSel);
    }
  }, [loading, profile]);

  const setLocation = useCallback((s: LocationSelection) => {
    setSelection(s);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, []);

  // Build the dropdown options adapted to the logged-in user's location
  const options: LocationOption[] = buildOptions(selection, countries, regions, localAreas, profile);

  return (
    <LocationContext.Provider
      value={{ selection, setLocation, options, loading, geoCountries: countries, geoRegions: regions, geoLocalAreas: localAreas }}
    >
      {children}
    </LocationContext.Provider>
  );
}

function buildOptions(
  _current: LocationSelection,
  countries: GeoCountry[],
  regions: GeoRegion[],
  localAreas: GeoLocalArea[],
  profile: { country: string | null; region: string | null; local_area: string | null; city: string | null } | null,
): LocationOption[] {
  const opts: LocationOption[] = [
    {
      level: 'global',
      label: 'Global',
      selection: ALL_LOCATIONS,
    },
  ];

  if (!profile?.country) {
    // No user location: show all countries as flat list (region/local only when a country is picked)
    countries.forEach((c) => {
      opts.push({
        level: 'country',
        label: c.name,
        selection: { level: 'country', country: c.name, region: null, localArea: null },
      });
    });
    return opts;
  }

  // User has a location — build the hierarchy for their country
  const userCountry = countries.find((c) => c.name === profile.country);

  opts.push({
    level: 'country',
    label: profile.country,
    selection: { level: 'country', country: profile.country, region: null, localArea: null },
  });

  const countryRegions = regions.filter((r) => r.country_id === userCountry?.id);
  const userRegionName = profile.region ?? null;

  if (countryRegions.length > 0) {
    // Show the user's own region (if set and exists), else all regions
    if (userRegionName && countryRegions.some((r) => r.name === userRegionName)) {
      opts.push({
        level: 'region',
        label: userRegionName,
        selection: { level: 'region', country: profile.country, region: userRegionName, localArea: null },
      });
    } else {
      countryRegions.forEach((r) => {
        opts.push({
          level: 'region',
          label: r.name,
          selection: { level: 'region', country: profile.country, region: r.name, localArea: null },
        });
      });
    }
  }

  // Local area — user's own, else all in their region (or country)
  const userLocalName = profile.local_area ?? profile.city ?? null;
  const regionId = userRegionName
    ? countryRegions.find((r) => r.name === userRegionName)?.id
    : undefined;

  if (userLocalName) {
    opts.push({
      level: 'local_area',
      label: userLocalName,
      selection: { level: 'local_area', country: profile.country, region: userRegionName, localArea: userLocalName },
    });
  } else if (regionId) {
    localAreas
      .filter((la) => la.region_id === regionId)
      .forEach((la) => {
        opts.push({
          level: 'local_area',
          label: la.name,
          selection: { level: 'local_area', country: profile.country, region: userRegionName, localArea: la.name },
        });
      });
  } else if (userCountry) {
    localAreas
      .filter((la) => la.country_id === userCountry.id)
      .forEach((la) => {
        opts.push({
          level: 'local_area',
          label: la.name,
          selection: { level: 'local_area', country: profile.country, region: la.region_id ? (countryRegions.find((r) => r.id === la.region_id)?.name ?? null) : null, localArea: la.name },
        });
      });
  }

  return opts;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
