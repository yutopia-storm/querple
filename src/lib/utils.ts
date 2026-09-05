import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(1, Math.floor((now - d) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const w = Math.floor(days / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function genYevoxId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Category accent colours — muted, tasteful palette.
// Used only for the bottom-half underline on category pills.
// ---------------------------------------------------------------------------
export interface CategoryAccent {
  accent: string;
}

const CATEGORY_ACCENTS: Record<string, string> = {
  politics: '#9333ea',
  'law-justice': '#2563eb',
  environment: '#16a34a',
  education: '#0891b2',
  health: '#dc2626',
  technology: '#4f46e5',
  'business-economy': '#d97706',
  science: '#7c3aed',
  society: '#e11d48',
  sport: '#059669',
  entertainment: '#ea580c',
  transport: '#0284c7',
  'arts-culture': '#db2777',
};

const DEFAULT_ACCENT = '#64748b';

function slugifyCategory(name: string): string {
  return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function categoryAccent(name: string, color?: string | null): CategoryAccent {
  const slug = slugifyCategory(name);
  const fromMap = CATEGORY_ACCENTS[slug];
  if (fromMap) return { accent: fromMap };
  if (color) return { accent: color };
  return { accent: DEFAULT_ACCENT };
}

// ---------------------------------------------------------------------------
// Fuel label — abbreviated with uppercase K/M suffix
// ---------------------------------------------------------------------------
export function fuelLabel(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${Math.floor(n / 100) / 10}K`;
  return `${Math.floor(n / 100000) / 10}M`;
}

// ---------------------------------------------------------------------------
// Country abbreviation — used on statement cards and discussion pages
// ---------------------------------------------------------------------------
const COUNTRY_ABBREVS: Record<string, string> = {
  'United Kingdom': 'UK',
  'United States': 'USA',
  'United Arab Emirates': 'UAE',
};

export function countryAbbrev(name: string): string {
  return COUNTRY_ABBREVS[name] ?? name;
}

// ---------------------------------------------------------------------------
// Location hierarchy — "UK • Scotland • Edinburgh" or "Global"
// ---------------------------------------------------------------------------
export function locationHierarchy(
  country: string | null,
  region: string | null,
  localArea: string | null,
): string {
  if (!country) return 'Global';
  const parts: string[] = [countryAbbrev(country)];
  if (region) parts.push(region);
  if (localArea) parts.push(localArea);
  return parts.join(' • ');
}

// ---------------------------------------------------------------------------
// Avatar colour palette
// ---------------------------------------------------------------------------
const PALETTE = [
  '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4',
];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
