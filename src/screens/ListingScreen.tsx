import { useState, useMemo } from 'react';
import { Flame, Zap, TrendingUp, Archive, Loader2 } from 'lucide-react';
import { useStatementList } from '@/hooks/useStatementList';
import { useInlineVoting } from '@/hooks/useInlineVoting';
import { usePlatform } from '@/hooks/usePlatform';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/context/LocationContext';
import { useToast } from '@/components/Toast';
import { StatementCard } from '@/components/StatementCard';
import { CategoryFilter } from '@/components/CategoryFilter';
import { cn } from '@/lib/utils';
import type { Statement } from '@/lib/types';

type View = 'live' | 'turbo' | 'trending' | 'archive';

const HEADERS: Record<View, { title: string; sub: string; icon: typeof Flame; sort: 'recent' | 'trending' }> = {
  live: { title: 'Live', sub: 'Statements collecting votes right now. Reasoning stays hidden until Turbo.', icon: Flame, sort: 'recent' },
  turbo: { title: 'Turbo', sub: 'Statements that earned enough participation. Reasoning is revealed and discussion is open.', icon: Zap, sort: 'recent' },
  trending: { title: 'Trending', sub: 'Statements gaining votes the fastest across the platform.', icon: TrendingUp, sort: 'trending' },
  archive: { title: 'Archive', sub: 'A permanent record of completed discussions. Searchable forever.', icon: Archive, sort: 'recent' },
};

export function ListingScreen({ view, navigate }: { view: View; navigate: (to: string) => void }) {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const platform = usePlatform();
  const toast = useToast();
  const { user } = useAuth();
  const { selection: location } = useLocation();

  // Trending sorts by velocity regardless of status, so we query live + turbo
  const { statements: rawStatements, loading } = useStatementList(
    view === 'trending' ? 'live' : view,
    HEADERS[view].sort,
    categoryId,
    location,
  );

  const { statements, myVotes, votingId, vote } = useInlineVoting(rawStatements);

  const h = HEADERS[view];
  const Icon = h.icon;

  const list = useMemo(() => {
    if (view !== 'trending') return statements;
    return [...statements].sort((a, b) => b.vote_velocity - a.vote_velocity).slice(0, 20);
  }, [statements, view]);

  const open = (id: string) => navigate(`/statement/${id}`);

  async function handleVote(id: string, value: 'agree' | 'disagree') {
    if (!user) {
      toast('Sign in to vote.', 'error');
      navigate('/login');
      return;
    }
    const res = await vote(id, value);
    if (!res.ok && res.needsAuth) {
      toast('Sign in to vote.', 'error');
      navigate('/login');
    } else if (res.ok) {
      if (res.action === 'cast') toast('Vote cast.', 'success');
      else if (res.action === 'changed') toast('Vote changed.', 'info');
      else if (res.action === 'removed') toast('Vote removed.', 'info');
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
          <Icon size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">{h.title}</h1>
          <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{h.sub}</p>
        </div>
      </div>

      {/* Category filter chips — horizontally scrollable on mobile */}
      <div className="mb-5">
        <CategoryFilter
          categories={platform.categories}
          selected={categoryId}
          onChange={setCategoryId}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ink-400" size={28} /></div>
      ) : list.length === 0 ? (
        <EmptyState view={view} filtered={!!categoryId} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((s: Statement) => (
            <StatementCard
              key={s.id}
              statement={s}
              onOpen={open}
              onNavigate={navigate}
              showResults={view === 'turbo' || view === 'archive'}
              myVote={myVotes[s.id] ?? null}
              voting={votingId === s.id}
              onVote={handleVote}
              turboThreshold={platform.turboThreshold}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ view, filtered }: { view: View; filtered: boolean }) {
  const msgs: Record<View, string> = {
    live: 'No statements collecting votes right now.',
    turbo: 'Nothing in Turbo at the moment.',
    trending: 'No trending statements yet.',
    archive: 'The archive is empty. Completed discussions will be preserved here forever.',
  };
  return (
    <div className={cn('card flex flex-col items-center justify-center py-20 text-center')}>
      <p className="text-sm text-ink-400">
        {filtered ? 'No statements in this category yet.' : msgs[view]}
      </p>
    </div>
  );
}
