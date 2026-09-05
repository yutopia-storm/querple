import { useEffect, useState } from 'react';
import { ArrowLeft, ThumbsUp, ThumbsDown, Loader2, Lock, Zap, Flame, Archive, Clock, Flag, Eye, Check, Fuel } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { usePlatform } from '@/hooks/usePlatform';
import { Avatar } from '@/components/Avatar';
import { StatusBadge, CategoryPill } from '@/components/StatementCard';
import { CommentSection } from '@/components/CommentSection';
import { Modal } from '@/components/Modal';
import { AuthorPopup } from '@/components/AuthorPopup';
import { cn, timeAgo, formatDate, compactNumber, pct, locationHierarchy, fuelLabel } from '@/lib/utils';
import type { Statement, Vote, Profile } from '@/lib/types';

export function StatementDetail({ id, navigate }: { id: string; navigate: (to: string) => void }) {
  const { user, profile } = useAuth();
  const toast = useToast();
  const platform = usePlatform();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [myVote, setMyVote] = useState<'agree' | 'disagree' | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [authorPopupOpen, setAuthorPopupOpen] = useState(false);
  const authorLoaded = author as Profile | null;

  const isTurboOrArchive = statement?.status === 'turbo' || statement?.status === 'archive';
  const showResults = (revealed && statement && statement.total_votes > 0) || isTurboOrArchive;

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('statements')
        .select('*, category:categories(*)')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) { setLoading(false); return; }
      const s = data as Statement;
      setStatement(s);
      if (s.author_id) {
        const { data: a } = await supabase.from('profiles').select('*').eq('id', s.author_id).maybeSingle();
        setAuthor(a as Profile);
      }
      if (user) {
        const { data: v } = await supabase.from('votes').select('*').eq('statement_id', id).eq('user_id', user.id).maybeSingle();
        setMyVote((v as Vote)?.value ?? null);
        if ((v as Vote)?.value) setRevealed(true);
      }
      setLoading(false);
    })();
  }, [id, user]);

  async function vote(value: 'agree' | 'disagree') {
    if (!user) { toast('Sign in to vote.', 'error'); navigate('/login'); return; }
    if (!statement) return;
    setVoting(true);
    if (myVote === value) {
      await supabase.from('votes').delete().eq('statement_id', id).eq('user_id', user.id);
      setMyVote(null);
      setRevealed(false);
      toast('Vote removed.', 'info');
    } else if (myVote) {
      await supabase.from('votes').update({ value, updated_at: new Date().toISOString() }).eq('statement_id', id).eq('user_id', user.id);
      setMyVote(value);
      toast('Vote changed.', 'info');
    } else {
      await supabase.from('votes').insert({ statement_id: id, user_id: user.id, value });
      setMyVote(value);
      setRevealed(true);
      toast('Vote cast — results revealed.', 'success');
    }
    // refresh counts
    const { data } = await supabase.from('statements').select('agree_count, disagree_count, total_votes, status, turbo_at').eq('id', id).maybeSingle();
    if (data) setStatement((prev) => prev ? { ...prev, ...(data as Partial<Statement>) } : prev);
    setVoting(false);
  }

  async function submitReport(reason: string) {
    if (!user) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: 'statement',
      target_id: id,
      reason,
    });
    if (error) toast(error.message, 'error');
    else toast('Report submitted. Thank you.', 'success');
    setReportOpen(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ink-400" size={28} /></div>
    );
  }

  if (!statement) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="text-sm text-ink-400">This statement could not be found or has been removed.</p>
        <button onClick={() => navigate('/')} className="btn-secondary mt-4">Back to home</button>
      </div>
    );
  }

  const agreePct = pct(statement.agree_count, statement.total_votes);
  const disagreePct = 100 - agreePct;

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft size={16} /> Back
      </button>

      <article className="card p-6">
        {/* Compact single-row header: status | category | location | time */}
        <div className="mb-4 flex items-center gap-2 overflow-hidden">
          <StatusBadge status={statement.status} />
          {statement.category && <CategoryPill category={statement.category} />}
          <span className="hidden text-xs font-medium text-ink-500 dark:text-ink-400 sm:inline">
            {locationHierarchy(statement.scope_country, statement.scope_region, statement.scope_local_area)}
          </span>
          <span className="ml-auto shrink-0 text-xs text-ink-400">{timeAgo(statement.created_at)}</span>
          {user && statement.author_id !== user.id && (
            <button onClick={() => setReportOpen(true)} className="btn-ghost h-7 px-2 text-xs">
              <Flag size={13} /> Report
            </button>
          )}
        </div>

        <h1 className="text-2xl font-bold leading-snug text-ink-900 dark:text-white">{statement.body}</h1>

        {/* Author row with fuel on same line */}
        <div className="mt-4 flex items-center gap-2.5 border-y border-ink-100 py-3 dark:border-ink-800">
          {authorLoaded && <Avatar name={authorLoaded.display_name} id={authorLoaded.id} size={28} />}
          <button
            onClick={() => authorLoaded && setAuthorPopupOpen(true)}
            className="text-sm font-medium text-ink-700 hover:underline dark:text-ink-200"
          >
            {authorLoaded?.display_name ?? 'Unknown'}
          </button>
          {authorLoaded && authorLoaded.total_fuel > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-ink-400">
              <Fuel size={12} className="text-brand-500 dark:text-brand-400" /> {fuelLabel(authorLoaded.total_fuel)}
            </span>
          )}
          <span className="ml-auto text-xs text-ink-400">{timeAgo(statement.created_at)}</span>
        </div>

        {/* Reasoning */}
        <div className="mt-4">
          {isTurboOrArchive ? (
            <div className="rounded-xl border border-brand-200/50 bg-brand-50/40 p-4 dark:border-brand-800/40 dark:bg-brand-950/20">
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
                <Eye size={15} /> Author's reasoning
              </div>
              <p className="text-sm leading-relaxed text-ink-700 dark:text-ink-200">{statement.reasoning}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-ink-200 p-4 text-sm text-ink-400 dark:border-ink-700">
              <Lock size={15} /> The author's reasoning is hidden until this statement reaches Turbo.
            </div>
          )}
        </div>

        {/* Voting */}
        <div className="mt-6">
          {!showResults ? (
            <div>
              <p className="mb-3 text-center text-sm font-medium text-ink-500 dark:text-ink-400">
                Vote blind — you'll see the results after you decide.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => vote('agree')}
                  disabled={voting}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border-2 py-4 text-base font-semibold transition-all',
                    myVote === 'agree'
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300'
                      : 'border-ink-200 text-ink-600 hover:border-brand-400 hover:bg-brand-50/50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-brand-950/20',
                  )}
                >
                  <ThumbsUp size={20} /> Agree
                </button>
                <button
                  onClick={() => vote('disagree')}
                  disabled={voting}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border-2 py-4 text-base font-semibold transition-all',
                    myVote === 'disagree'
                      ? 'border-drag-500 bg-drag-500/10 text-drag-600'
                      : 'border-ink-200 text-ink-600 hover:border-drag-400 hover:bg-drag-500/5 dark:border-ink-700 dark:text-ink-300',
                  )}
                >
                  <ThumbsDown size={20} /> Disagree
                </button>
              </div>
              {!user && (
                <p className="mt-3 text-center text-xs text-ink-400">
                  <button onClick={() => navigate('/login')} className="font-medium text-brand-600">Sign in</button> to vote.
                </p>
              )}
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span className="text-brand-600 dark:text-brand-400">{agreePct}% Agree</span>
                <span className="text-ink-400">{compactNumber(statement.total_votes)} votes</span>
                <span className="text-drag-600 dark:text-drag-500">{disagreePct}% Disagree</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <div className="bg-brand-500 transition-all duration-500" style={{ width: `${agreePct}%` }} />
                <div className="bg-drag-500 transition-all duration-500" style={{ width: `${disagreePct}%` }} />
              </div>
              {user && statement.status === 'live' && (
                <p className="mt-3 text-center text-xs text-ink-400">
                  You voted {myVote}.{' '}
                  <button onClick={() => vote(myVote!)} className="font-medium text-brand-600 hover:underline">Change vote</button>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Archive meta */}
        {statement.status === 'archive' && (
          <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-ink-50 p-4 dark:bg-ink-800/50 sm:grid-cols-4">
            <Stat label="Total votes" value={compactNumber(statement.total_votes)} />
            <Stat label="Comments" value={compactNumber(statement.comment_count)} />
            <Stat label="Agree" value={`${agreePct}%`} />
            <Stat label="Archived" value={formatDate(statement.archive_at)} />
          </div>
        )}

        {/* Lifecycle timing for live */}
        {statement.status === 'live' && statement.live_until && (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-400">
            <Clock size={13} /> {Math.max(0, Math.ceil((new Date(statement.live_until).getTime() - Date.now()) / 86400000))} days left to reach Turbo
          </div>
        )}
      </article>

      {/* Comments */}
      {isTurboOrArchive ? (
        <div className="mt-6">
          <CommentSection
            statementId={id}
            maxDepth={platform.maxThreadDepth}
            maxCommentLength={platform.maxCommentLength}
            canComment={statement.status === 'turbo'}
          />
        </div>
      ) : (
        <div className="card mt-6 p-6 text-center">
          <Lock className="mx-auto mb-2 text-ink-300" size={22} />
          <p className="text-sm text-ink-400">Discussion opens once this statement reaches Turbo.</p>
        </div>
      )}

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={submitReport} />

      <AuthorPopup
        authorId={authorPopupOpen ? (statement.author_id ?? null) : null}
        author={authorLoaded}
        onClose={() => setAuthorPopupOpen(false)}
        onViewContributions={(yevoxId) => {
          setAuthorPopupOpen(false);
          navigate(`/profile/${yevoxId}`);
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-ink-900 dark:text-white">{value}</p>
      <p className="text-xs text-ink-400">{label}</p>
    </div>
  );
}

function ReportModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (r: string) => void }) {
  const [reason, setReason] = useState('');
  const REASONS = ['Hate speech', 'Spam', 'Threats', 'Harassment', 'Illegal content', 'Doxxing'];
  return (
    <Modal open={open} onClose={onClose} title="Report statement" size="sm">
      <p className="mb-3 text-sm text-ink-500">Yevox moderates behaviour, not opinion. Only report content that violates the community guidelines.</p>
      <div className="space-y-1.5">
        {REASONS.map((r) => (
          <button
            key={r}
            onClick={() => setReason(r)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors',
              reason === r ? 'border-brand-500 bg-brand-50 text-ink-900 dark:bg-brand-950/30 dark:text-white' : 'border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800',
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <button onClick={() => reason && onSubmit(reason)} disabled={!reason} className="btn-primary mt-4 w-full">Submit report</button>
    </Modal>
  );
}
