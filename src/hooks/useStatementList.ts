import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Statement } from '@/lib/types';
import type { LocationSelection } from '@/lib/geo';

type ListStatus = 'live' | 'turbo' | 'archive' | 'stalled';

const STATUS_MAP: Record<ListStatus, string> = {
  live: 'live',
  turbo: 'turbo',
  archive: 'archive',
  stalled: 'stalled',
};

export function useStatementList(
  status: ListStatus,
  sort: 'recent' | 'trending' | 'fuel' = 'recent',
  categoryId?: string | null,
  location?: LocationSelection,
) {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('statements')
      .select('*, author:profiles!statements_author_id_fkey(*), category:categories(*)')
      .eq('status', STATUS_MAP[status]);

    if (categoryId) q = q.eq('category_id', categoryId);

    // Location filtering
    if (location) {
      const isAll = location.level === 'global' && !location.country;
      if (!isAll) {
        if (location.level === 'global') {
          q = q.eq('scope', 'global');
        } else if (location.level === 'country') {
          q = q.eq('scope', 'country').eq('scope_country', location.country);
        } else if (location.level === 'region') {
          // Region-scoped statements use scope='country' with scope_region set,
          // plus statements scoped to a local area within that region.
          q = q
            .eq('scope_country', location.country)
            .or(`scope_region.eq.${location.region},scope.eq.country`);
        } else if (location.level === 'local_area') {
          q = q
            .eq('scope_country', location.country)
            .or(`scope_local_area.eq.${location.localArea},scope.eq.country`);
        }
      }
    }

    if (sort === 'trending') q = q.order('vote_velocity', { ascending: false });
    else if (sort === 'fuel') q = q.order('comment_count', { ascending: false });
    else q = q.order('created_at', { ascending: false });

    q = q.limit(50);

    const { data, error } = await q;
    if (error) setError(error.message);
    setStatements((data as Statement[]) ?? []);
    setLoading(false);
  }, [status, sort, categoryId, location]);

  useEffect(() => {
    load();
  }, [load]);

  return { statements, loading, error, reload: load };
}
