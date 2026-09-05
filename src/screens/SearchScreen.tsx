import { useEffect, useState } from 'react';
import { Search as SearchIcon, Loader2, Filter, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePlatform } from '@/hooks/usePlatform';
import { useLocation } from '@/context/LocationContext';
import { StatementCard } from '@/components/StatementCard';
import { CategoryFilter } from '@/components/CategoryFilter';
import { cn } from '@/lib/utils';
import type { Statement, StatementStatus } from '@/lib/types';

type StatusFilter = 'all' | StatementStatus;

export function SearchScreen({ navigate }: { navigate: (to: string) => void }) {
  const platform = usePlatform();
  const { selection: location } = useLocation();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<string | null>(null);
  const [results, setResults] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => doSearch(), 300);
    return () => clearTimeout(t);
  }, [q, status, category, location]);

  async function doSearch() {
    setLoading(true);
    let query = supabase
      .from('statements')
      .select('*, author:profiles!statements_author_id_fkey(*), category:categories(*)')
      .order('created_at', { ascending: false });

    if (q.trim()) {
      query = query.or(`body.ilike.%${q.trim()}%,reasoning.ilike.%${q.trim()}%`);
    }
    if (status !== 'all') query = query.eq('status', status);
    else query = query.in('status', ['live', 'turbo', 'archive']);
    if (category) query = query.eq('category_id', category);

    // Location filtering
    const isAll = location.level === 'global' && !location.country;
    if (!isAll) {
      if (location.level === 'global') {
        query = query.eq('scope', 'global');
      } else if (location.level === 'country') {
        query = query.eq('scope', 'country').eq('scope_country', location.country);
      } else if (location.level === 'region') {
        query = query
          .eq('scope_country', location.country)
          .or(`scope_region.eq.${location.region},scope.eq.country`);
      } else if (location.level === 'local_area') {
        query = query
          .eq('scope_country', location.country)
          .or(`scope_local_area.eq.${location.localArea},scope.eq.country`);
      }
    }

    query = query.limit(40);
    const { data } = await query;
    setResults((data as Statement[]) ?? []);
    setLoading(false);
  }

  const hasFilters = status !== 'all' || !!category;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Search</h1>

      <div className="relative">
        <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          className="input pl-11 pr-10"
          placeholder="Search statements, keywords, topics…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="mt-3">
        <CategoryFilter
          categories={platform.categories}
          selected={category}
          onChange={setCategory}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn('btn-ghost text-sm', hasFilters && 'text-brand-600')}
        >
          <Filter size={15} /> More filters {hasFilters && `(${(status !== 'all' ? 1 : 0) + (category ? 1 : 0)})`}
        </button>
      </div>

      {showFilters && (
        <div className="mt-3 grid animate-fade-in gap-3 rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900 sm:grid-cols-2">
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
              <option value="all">All</option>
              <option value="live">Live</option>
              <option value="turbo">Turbo</option>
              <option value="archive">Archive</option>
            </select>
          </div>
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-ink-400" size={24} /></div>
        ) : results.length === 0 ? (
          <div className="card p-12 text-center text-sm text-ink-400">
            {q || hasFilters || !location.country ? 'No statements match your search.' : 'Start typing to search the archive and active statements.'}
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-400">{results.length} result{results.length !== 1 && 's'}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((s) => (
                <StatementCard
                  key={s.id}
                  statement={s}
                  onOpen={(id) => navigate(`/statement/${id}`)}
                  onNavigate={navigate}
                  showResults={s.status === 'turbo' || s.status === 'archive'}
                  turboThreshold={platform.turboThreshold}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
