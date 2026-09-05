import { useState, useEffect } from 'react';
import { Fuel, Anchor, Reply, Trash2, MoreHorizontal, Clock, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Avatar } from '@/components/Avatar';
import { Modal } from '@/components/Modal';
import { cn, timeAgo, compactNumber } from '@/lib/utils';
import type { Comment, CommentRating } from '@/lib/types';

type SortMode = 'fuel' | 'newest' | 'drag';

export function CommentSection({
  statementId,
  maxDepth,
  maxCommentLength,
  canComment,
}: {
  statementId: string;
  maxDepth: number;
  maxCommentLength: number;
  canComment: boolean;
}) {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>('fuel');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [topBody, setTopBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ratings, setRatings] = useState<Record<string, 'fuel' | 'drag'>>({});
  const [reportTarget, setReportTarget] = useState<Comment | null>(null);

  async function loadComments() {
    const { data } = await supabase
      .from('comments')
      .select('*, author:profiles!comments_author_id_fkey(*)')
      .eq('statement_id', statementId)
      .order('created_at', { ascending: true });
    setComments((data as Comment[]) ?? []);
    setLoading(false);
  }

  async function loadMyRatings() {
    if (!user) return;
    const { data } = await supabase
      .from('comment_ratings')
      .select('*')
      .eq('user_id', user.id)
      .in('comment_id', comments.map((c) => c.id));
    const map: Record<string, 'fuel' | 'drag'> = {};
    (data as CommentRating[])?.forEach((r) => (map[r.comment_id] = r.rating));
    setRatings(map);
  }

  useEffect(() => { loadComments(); }, [statementId]);
  useEffect(() => { loadMyRatings(); }, [comments, user]);

  // Build threaded tree
  const tree = buildTree(comments);
  const sorted = sortTree(tree, sort);

  async function submitComment(parentId: string | null, body: string, depth: number) {
    if (!user || !profile) { toast('Sign in to comment.', 'error'); return; }
    if (profile.is_suspended || profile.is_banned) { toast('Your account is restricted.', 'error'); return; }
    if (!body.trim()) { toast('Comment cannot be empty.', 'error'); return; }
    if (depth > maxDepth) { toast('Maximum thread depth reached.', 'error'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('comments').insert({
      statement_id: statementId,
      author_id: user.id,
      parent_id: parentId,
      depth,
      body: body.trim(),
    });
    setSubmitting(false);
    if (error) { toast(error.message, 'error'); return; }
    toast('Comment posted.', 'success');
    if (parentId) { setReplyTo(null); setReplyBody(''); }
    else setTopBody('');
    loadComments();
  }

  async function rateComment(c: Comment, rating: 'fuel' | 'drag') {
    if (!user) { toast('Sign in to rate comments.', 'error'); return; }
    const existing = ratings[c.id];
    if (existing === rating) {
      await supabase.from('comment_ratings').delete().eq('comment_id', c.id).eq('user_id', user.id);
      toast('Rating removed.', 'info');
    } else {
      if (existing) {
        await supabase.from('comment_ratings').delete().eq('comment_id', c.id).eq('user_id', user.id);
      }
      const { error } = await supabase.from('comment_ratings').insert({ comment_id: c.id, user_id: user.id, rating });
      if (error) { toast(error.message, 'error'); return; }
      toast(rating === 'fuel' ? 'Fuelled — moves discussion forward.' : 'Dragged — detracts from discussion.', 'info');
    }
    loadComments();
  }

  async function deleteComment(c: Comment) {
    const { error } = await supabase.from('comments').update({ is_deleted: true }).eq('id', c.id).eq('author_id', user!.id);
    if (error) { toast(error.message, 'error'); return; }
    toast('Comment deleted.', 'info');
    loadComments();
  }

  async function submitReport(reason: string) {
    if (!reportTarget || !user) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: 'comment',
      target_id: reportTarget.id,
      reason,
    });
    if (error) toast(error.message, 'error');
    else toast('Report submitted. Thank you.', 'success');
    setReportTarget(null);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white">Discussion</h2>
        <div className="flex items-center gap-1 rounded-lg bg-ink-100 p-1 dark:bg-ink-800">
          {([['fuel', 'Most Fuel'], ['newest', 'Newest'], ['drag', 'Most Drag']] as const).map(([m, l]) => (
            <button
              key={m}
              onClick={() => setSort(m)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                sort === m ? 'bg-white text-ink-900 shadow-soft dark:bg-ink-700 dark:text-white' : 'text-ink-500',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Compose */}
      {canComment && user ? (
        <div className="mb-6 flex gap-3">
          <Avatar name={profile?.display_name ?? ''} id={user.id} size={36} />
          <div className="flex-1">
            <textarea
              className="input min-h-[80px] resize-none"
              placeholder="Add to the discussion…"
              value={topBody}
              maxLength={maxCommentLength}
              onChange={(e) => setTopBody(e.target.value)}
            />
            <div className="mt-2 flex items-center justify-between">
              <CharCount value={topBody} max={maxCommentLength} />
              <button
                onClick={() => submitComment(null, topBody, 0)}
                disabled={submitting || !topBody.trim()}
                className="btn-primary"
              >
                <Send size={15} /> Post
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card mb-6 p-4 text-center text-sm text-ink-400">
          {user ? 'Comments open once this statement reaches Turbo.' : 'Sign in to join the discussion.'}
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-ink-400">Loading discussion…</p>
      ) : sorted.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-400">No comments yet. Be the first to start the discussion.</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => (
            <CommentItem
              key={c.id}
              c={c}
              user={user}
              profile={profile}
              maxDepth={maxDepth}
              maxCommentLength={maxCommentLength}
              ratings={ratings}
              replyTo={replyTo}
              replyBody={replyBody}
              setReplyTo={setReplyTo}
              setReplyBody={setReplyBody}
              onReply={(parentId, body, depth) => submitComment(parentId, body, depth)}
              onRate={rateComment}
              onDelete={deleteComment}
              onReport={setReportTarget}
              submitting={submitting}
            />
          ))}
        </div>
      )}

      <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} onSubmit={submitReport} />
    </div>
  );
}

function CommentItem({
  c, user, profile, maxDepth, maxCommentLength, ratings, replyTo, replyBody,
  setReplyTo, setReplyBody, onReply, onRate, onDelete, onReport, submitting,
}: {
  c: Comment;
  user: { id: string } | null;
  profile: { display_name: string } | null;
  maxDepth: number;
  maxCommentLength: number;
  ratings: Record<string, 'fuel' | 'drag'>;
  replyTo: string | null;
  replyBody: string;
  setReplyTo: (id: string | null) => void;
  setReplyBody: (v: string) => void;
  onReply: (parentId: string, body: string, depth: number) => void;
  onRate: (c: Comment, r: 'fuel' | 'drag') => void;
  onDelete: (c: Comment) => void;
  onReport: (c: Comment) => void;
  submitting: boolean;
}) {
  const myRating = ratings[c.id];
  const isAuthor = user?.id === c.author_id;
  const canReply = c.depth < maxDepth;
  const [menuOpen, setMenuOpen] = useState(false);

  if (c.is_removed) {
    return (
      <div className={cn('rounded-xl border p-4', 'border-drag-500/20 bg-drag-500/5')}>
        <p className="text-sm italic text-ink-400">Comment removed by moderation{c.removed_reason ? `: ${c.removed_reason}` : ''}.</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900', c.depth > 0 && 'ml-4 sm:ml-6')}>
      <div className="flex items-start gap-3">
        <Avatar name={c.author?.display_name ?? '?'} id={c.author_id} size={32} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink-900 dark:text-white">{c.author?.display_name ?? 'Unknown'}</span>
            {c.edited_at && <span className="text-xs text-ink-400">edited {timeAgo(c.edited_at)}</span>}
            <span className="text-xs text-ink-400">{timeAgo(c.created_at)}</span>
            <div className="ml-auto relative">
              <button onClick={() => setMenuOpen((o) => !o)} className="btn-ghost h-7 w-7 p-0">
                <MoreHorizontal size={15} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-40 w-36 animate-scale-in rounded-lg border border-ink-200 bg-white p-1 shadow-float dark:border-ink-800 dark:bg-ink-900">
                    {user && !isAuthor && (
                      <button onClick={() => { onReport(c); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">
                        Report
                      </button>
                    )}
                    {isAuthor && (
                      <button onClick={() => { onDelete(c); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-drag-600 hover:bg-drag-500/10">
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {c.is_deleted ? (
            <p className="mt-1.5 text-sm italic text-ink-400">Comment deleted by author.</p>
          ) : (
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-700 dark:text-ink-200">{c.body}</p>
          )}

          <div className="mt-3 flex items-center gap-1">
            <RateButton
              active={myRating === 'fuel'}
              onClick={() => onRate(c, 'fuel')}
              icon={Fuel}
              count={c.fuel_count}
              activeClass="bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400"
              label="Fuel"
            />
            <RateButton
              active={myRating === 'drag'}
              onClick={() => onRate(c, 'drag')}
              icon={Anchor}
              count={c.drag_count}
              activeClass="bg-drag-500/10 text-drag-600"
              label="Drag"
            />
            {canReply && user && !c.is_deleted && (
              <button
                onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyBody(''); }}
                className="btn-ghost ml-1 h-8 px-2.5 text-xs"
              >
                <Reply size={13} /> Reply
              </button>
            )}
          </div>

          {replyTo === c.id && (
            <div className="mt-3 animate-fade-in">
              <textarea
                className="input min-h-[60px] resize-none text-sm"
                placeholder={`Reply to ${c.author?.display_name ?? ''}…`}
                value={replyBody}
                maxLength={maxCommentLength}
                onChange={(e) => setReplyBody(e.target.value)}
              />
              <div className="mt-1.5 flex items-center justify-between">
                <CharCount value={replyBody} max={maxCommentLength} />
                <div className="flex gap-2">
                  <button onClick={() => { setReplyTo(null); setReplyBody(''); }} className="btn-ghost text-xs">Cancel</button>
                  <button onClick={() => onReply(c.id, replyBody, c.depth + 1)} disabled={submitting || !replyBody.trim()} className="btn-primary text-xs">
                    <Send size={13} /> Reply
                  </button>
                </div>
              </div>
            </div>
          )}

          {c.children && c.children.length > 0 && (
            <div className="mt-3 space-y-3 border-l-2 border-ink-100 pl-3 dark:border-ink-800">
              {c.children.map((child) => (
                <CommentItem
                  key={child.id}
                  c={child}
                  user={user}
                  profile={profile}
                  maxDepth={maxDepth}
                  maxCommentLength={maxCommentLength}
                  ratings={ratings}
                  replyTo={replyTo}
                  replyBody={replyBody}
                  setReplyTo={setReplyTo}
                  setReplyBody={setReplyBody}
                  onReply={onReply}
                  onRate={onRate}
                  onDelete={onDelete}
                  onReport={onReport}
                  submitting={submitting}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RateButton({
  active, onClick, icon: Icon, count, activeClass, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Fuel;
  count: number;
  activeClass: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
        active ? activeClass : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800',
      )}
      title={label}
    >
      <Icon size={14} /> {compactNumber(count)}
    </button>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const remaining = max - value.length;
  return (
    <span className={cn('text-xs', remaining < 30 ? 'text-drag-500' : 'text-ink-400')}>
      {remaining} left
    </span>
  );
}

function ReportModal({
  target, onClose, onSubmit,
}: {
  target: Comment | null;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const REASONS = ['Hate speech', 'Spam', 'Threats', 'Harassment', 'Illegal content', 'Doxxing'];
  return (
    <Modal open={!!target} onClose={onClose} title="Report comment" size="sm">
      <p className="mb-3 text-sm text-ink-500">Yevox moderates behaviour, not opinion. Only report content that violates the community guidelines.</p>
      <div className="space-y-1.5">
        {REASONS.map((r) => (
          <button
            key={r}
            onClick={() => { setReason(r); }}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors',
              reason === r ? 'border-brand-500 bg-brand-50 text-ink-900 dark:bg-brand-950/30 dark:text-white' : 'border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800',
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <button
        onClick={() => reason && onSubmit(reason)}
        disabled={!reason}
        className="btn-primary mt-4 w-full"
      >
        Submit report
      </button>
    </Modal>
  );
}

function buildTree(flat: Comment[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];
  flat.forEach((c) => map.set(c.id, { ...c, children: [] }));
  flat.forEach((c) => {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children!.push(map.get(c.id)!);
    } else {
      roots.push(map.get(c.id)!);
    }
  });
  return roots;
}

function sortTree(items: Comment[], sort: SortMode): Comment[] {
  const cmp = (a: Comment, b: Comment) => {
    if (sort === 'fuel') return b.fuel_count - a.fuel_count;
    if (sort === 'drag') return b.drag_count - a.drag_count;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  };
  return items
    .map((i) => ({ ...i, children: i.children ? sortTree(i.children, sort) : [] }))
    .sort(cmp);
}
