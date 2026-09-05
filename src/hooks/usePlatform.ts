import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, FeatureFlag, Announcement } from '@/lib/types';

export interface HomeContent {
  headline: string;
  subheading: string;
}
export interface Branding {
  platformName: string;
  tagline: string;
}

interface PlatformData {
  categories: Category[];
  flags: Record<string, boolean>;
  home: HomeContent;
  branding: Branding;
  turboThreshold: number;
  turboDurationDays: number;
  stallDurationDays: number;
  maxStatementLength: number;
  maxReasoningLength: number;
  maxCommentLength: number;
  maxThreadDepth: number;
  statementLimitPerDay: number;
  announcements: Announcement[];
  loading: boolean;
}

export function usePlatform(): PlatformData {
  const [data, setData] = useState<Omit<PlatformData, 'loading'>>({
    categories: [],
    flags: {},
    home: { headline: '', subheading: '' },
    branding: { platformName: 'Yevox', tagline: '' },
    turboThreshold: 50,
    turboDurationDays: 14,
    stallDurationDays: 30,
    maxStatementLength: 250,
    maxReasoningLength: 500,
    maxCommentLength: 500,
    maxThreadDepth: 4,
    statementLimitPerDay: 3,
    announcements: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [cats, flags, settings, anns] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order').then((r) => r.data as Category[] | null),
        supabase.from('feature_flags').select('*').then((r) => r.data as FeatureFlag[] | null),
        supabase.from('platform_settings').select('*').then((r) => r.data as { key: string; value: Record<string, unknown> }[] | null),
        supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .or('end_at.is.null,end_at.gt.now()')
          .order('created_at', { ascending: false })
          .then((r) => r.data as Announcement[] | null),
      ]);

      const flagMap: Record<string, boolean> = {};
      (flags ?? []).forEach((f) => (flagMap[f.key] = f.is_enabled));

      const sMap: Record<string, Record<string, unknown>> = {};
      (settings ?? []).forEach((s) => (sMap[s.key] = s.value));

      const num = (k: string, def: number) => (sMap[k]?.value as number) ?? def;

      setData({
        categories: cats ?? [],
        flags: flagMap,
        home: (sMap['home'] as unknown as HomeContent) ?? { headline: '', subheading: '' },
        branding: (sMap['branding'] as unknown as Branding) ?? { platformName: 'Yevox', tagline: '' },
        turboThreshold: num('turbo_threshold', 50),
        turboDurationDays: num('turbo_duration_days', 14),
        stallDurationDays: num('stall_duration_days', 30),
        maxStatementLength: num('max_statement_length', 250),
        maxReasoningLength: num('max_reasoning_length', 500),
        maxCommentLength: num('max_comment_length', 500),
        maxThreadDepth: num('max_thread_depth', 4),
        statementLimitPerDay: num('statement_limit_per_day', 3),
        announcements: anns ?? [],
      });
      setLoading(false);
    })();
  }, []);

  return { ...data, loading };
}
