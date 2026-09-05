import { useState } from 'react';
import { Flame, Zap, Archive, Lock, MessageCircle, ThumbsUp, ThumbsDown, Loader2, Check, Fuel } from 'lucide-react';
import type { Statement, StatementStatus, Category } from '@/lib/types';
import { compactNumber, timeAgo, pct, cn, categoryAccent, locationHierarchy, fuelLabel } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { AuthorPopup } from '@/components/AuthorPopup';

export function StatusBadge({ status, className }: { status: StatementStatus; className?: string }) {
  const map = {
    live: { label: 'Live', icon: Flame, cls: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400' },
    turbo: { label: 'Turbo', icon: Zap, cls: 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400' },
    archive: { label: 'Archived', icon: Archive, cls: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400' },
    stalled: { label: 'Stalled', icon: Lock, cls: 'bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500' },
    draft: { label: 'Draft', icon: Lock, cls: 'bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500' },
    removed: { label: 'Removed', icon: Lock, cls: 'bg-drag-500/10 text-drag-600' },
  } as const;
  const s = map[status];
  const Icon = s.icon;
  return (
    <span className={cn('chip', s.cls, className)}>
      <Icon size={12} /> {s.label}
    </span>
  );
}

/** Location badge — uses clean hierarchy like "UK • Scotland • Edinburgh" */
export function LocationBadge({ statement: s, className }: { statement: Statement; className?: string }) {
  const label = locationHierarchy(s.scope_country, s.scope_region, s.scope_local_area);
  return (
    <span className={cn('text-xs font-medium text-ink-500 dark:text-ink-400', className)}>
      {label}
    </span>
  );
}

/** Category pill — minimal, subtle background with accent dot */
export function CategoryPill({ category }: { category: Category | null }) {
  if (!category) return null;
  const accent = categoryAccent(category.name, category.color);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent.accent }} />
      {category.name}
    </span>
  );
}

interface VoteBarProps {
  statement: Statement;
}

export function VoteBar({ statement: s }: VoteBarProps) {
  const agreePct = pct(s.agree_count, s.total_votes);
  const disagreePct = 100 - agreePct;
  if (s.total_votes === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium text-ink-500 dark:text-ink-400">
        <span className="text-brand-600 dark:text-brand-400">{agreePct}% Agree</span>
        <span className="text-drag-600 dark:text-drag-500">{disagreePct}% Disagree</span>
      </div>
      <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
        <div className="bg-brand-500 transition-all duration-500" style={{ width: `${agreePct}%` }} />
        <div className="bg-drag-500 transition-all duration-500" style={{ width: `${disagreePct}%` }} />
      </div>
    </div>
  );
}

/** Turbo progress section. Shows progress towards the threshold or "Turbo Unlocked". */
function TurboProgress({ statement: s, threshold }: { statement: Statement; threshold: number }) {
  if (s.status === 'turbo' || s.status === 'archive') {
    return (
      <div className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-50 py-2 text-sm font-semibold text-brand-700 dark:bg-brand-950/30 dark:text-brand-300">
        <Check size={15} /> Turbo Unlocked
      </div>
    );
  }
  const votes = s.total_votes;
  const progress = Math.min(100, Math.round((votes / threshold) * 100));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-ink-500 dark:text-ink-400">Progress to Turbo</span>
        <span className="font-semibold text-ink-700 dark:text-ink-200">
          {compactNumber(votes)} / {compactNumber(threshold)} votes
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export interface StatementCardProps {
  statement: Statement;
  onOpen: (id: string) => void;
  onNavigate?: (path: string) => void;
  showResults?: boolean;
  myVote?: 'agree' | 'disagree' | null;
  voting?: boolean;
  onVote?: (id: string, value: 'agree' | 'disagree') => void;
  turboThreshold?: number;
}

export function StatementCard({
  statement,
  onOpen,
  onNavigate,
  showResults = false,
  myVote,
  voting,
  onVote,
  turboThreshold = 50,
}: StatementCardProps) {
  const s = statement;
  const isTurboOrArchive = s.status === 'turbo' || s.status === 'archive';
  const showBar = showResults && s.total_votes > 0 && isTurboOrArchive;
  const canVoteInline = s.status === 'live' || s.status === 'turbo';
  const showInlineVotes = canVoteInline && onVote;
  const showTurboProgress = s.status === 'live' || isTurboOrArchive;
  const [popupAuthorId, setPopupAuthorId] = useState<string | null>(null);

  return (
    <>
      <article
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('[data-vote-btn]')) return;
          if ((e.target as HTMLElement).closest('[data-author-btn]')) return;
          onOpen(s.id);
        }}
        className="card group animate-slide-up cursor-pointer p-5 transition-all duration-200 hover:shadow-float hover:-translate-y-0.5"
      >
        {/* Compact single-row header: status | category | location | time */}
        <div className="mb-3 flex items-center gap-2 overflow-hidden">
          <StatusBadge status={s.status} />
          <CategoryPill category={s.category} />
          <LocationBadge statement={s} className="hidden sm:inline" />
          <span className="ml-auto shrink-0 text-xs text-ink-400">{timeAgo(s.created_at)}</span>
        </div>

        {/* Statement body */}
        <h2 className="text-lg font-semibold leading-snug text-ink-900 dark:text-white">{s.body}</h2>

        {/* Reasoning locked message */}
        {!isTurboOrArchive && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-ink-400">
            <Lock size={14} />
            <span>Author's reasoning revealed at Turbo</span>
          </div>
        )}

        {/* Results bar (turbo/archive) */}
        {showBar && (
          <div className="mt-4">
            <VoteBar statement={s} />
          </div>
        )}

        {/* Agree / Disagree buttons */}
        {showInlineVotes && (
          <div className="mt-4 flex items-stretch gap-2" data-vote-btn>
            <button
              onClick={() => onVote(s.id, 'agree')}
              disabled={voting}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 py-2 text-sm font-semibold transition-all disabled:opacity-60',
                myVote === 'agree'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300'
                  : 'border-ink-200 text-ink-600 hover:border-brand-400 hover:bg-brand-50/50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-brand-950/20',
              )}
            >
              {voting ? <Loader2 size={15} className="animate-spin" /> : <ThumbsUp size={15} />}
              Agree
            </button>
            <button
              onClick={() => onVote(s.id, 'disagree')}
              disabled={voting}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 py-2 text-sm font-semibold transition-all disabled:opacity-60',
                myVote === 'disagree'
                  ? 'border-drag-500 bg-drag-500/10 text-drag-600'
                  : 'border-ink-200 text-ink-600 hover:border-drag-400 hover:bg-drag-500/5 dark:border-ink-700 dark:text-ink-300',
              )}
            >
              {voting ? <Loader2 size={15} className="animate-spin" /> : <ThumbsDown size={15} />}
              Disagree
            </button>
          </div>
        )}

        {/* Turbo Progress */}
        {showTurboProgress && (
          <div className="mt-4">
            <TurboProgress statement={s} threshold={turboThreshold} />
          </div>
        )}

        {/* Author row with fuel */}
        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 dark:border-ink-800">
          <div className="flex items-center gap-2">
            {s.author && <Avatar name={s.author.display_name} id={s.author.id} size={24} />}
            <button
              data-author-btn
              onClick={(e) => {
                e.stopPropagation();
                if (s.author_id) setPopupAuthorId(s.author_id);
              }}
              className="text-sm font-medium text-ink-500 hover:text-ink-900 hover:underline dark:text-ink-400 dark:hover:text-white"
            >
              {s.author?.display_name ?? 'Unknown'}
            </button>
            {s.author && s.author.total_fuel > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-ink-400">
                <Fuel size={12} className="text-brand-500 dark:text-brand-400" /> {fuelLabel(s.author.total_fuel)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-ink-400">
            {isTurboOrArchive && (
              <span className="flex items-center gap-1">
                <MessageCircle size={13} /> {compactNumber(s.comment_count)}
              </span>
            )}
          </div>
        </div>
      </article>

      <AuthorPopup
        authorId={popupAuthorId}
        author={s.author}
        onClose={() => setPopupAuthorId(null)}
        onViewContributions={(yevoxId) => {
          setPopupAuthorId(null);
          onNavigate?.(`/profile/${yevoxId}`);
        }}
      />
    </>
  );
}
