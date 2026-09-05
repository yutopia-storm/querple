export interface GeoCountry {
  id: string;
  name: string;
  iso_code: string | null;
  flag_emoji: string | null;
  has_regions: boolean;
  sort_order: number;
  is_disabled: boolean;
}

export interface GeoRegion {
  id: string;
  country_id: string;
  name: string;
  short_code: string | null;
  sort_order: number;
  is_disabled: boolean;
}

export interface GeoLocalArea {
  id: string;
  country_id: string;
  region_id: string | null;
  name: string;
  sort_order: number;
  is_disabled: boolean;
}

export type GeoLevel = 'global' | 'country' | 'region' | 'local_area';

export interface LocationSelection {
  level: GeoLevel;
  country: string | null;
  region: string | null;
  localArea: string | null;
}

export const ALL_LOCATIONS: LocationSelection = {
  level: 'global',
  country: null,
  region: null,
  localArea: null,
};
