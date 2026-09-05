import { useEffect, useState } from 'react';
import { Shield, Eye, Trash2, RotateCcw, Loader2, FileText, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { cn, timeAgo } from '@/lib/utils';
import { logAdminAction } from '@/screens/AdminDashboard';
import type { Statement, Comment } from '@/lib/types';

export function AdminModeration() {
  const toast = useToast();
  const [tab, setTab] = useState<'statements' | 'comments'>('statements');
  const [statements, setStatements] = useState<Statement[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    if (tab === 'statements') {
      const { data } = await supabase
        .from('statements')
        .select('*, author:profiles!statements_author_id_fkey(display_name), category:categories(name)')
        .order('created_at', { ascending: false })
        .limit(60);
      setStatements((data as Statement[]) ?? []);
    } else {
      const { data } = await supabase
        .from('comments')
        .select('*, author:profiles!comments_author_id_fkey(display_name), statement:statements(body)')
        .order('created_at', { ascending: false })
        .limit(60);
      setComments((data as Comment[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [tab]);

  async function removeStatement(s: Statement) {
    const { error } = await supabase.from('statements').update({
      status: 'removed',
      removed_at: new Date().toISOString(),
      removed_reason: 'Removed by moderator',
    }).eq('id', s.id);
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction('remove_statement', 'statement', s.id, { body: s.body });
    toast('Statement removed.', 'success');
    load();
  }

  async function restoreStatement(s: Statement) {
    const { error } = await supabase.from('statements').update({
      status: 'live',
      removed_at: null,
      removed_reason: null,
    }).eq('id', s.id);
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction('restore_statement', 'statement', s.id);
    toast('Statement restored.', 'success');
    load();
  }

  async function removeComment(c: Comment) {
    const { error } = await supabase.from('comments').update({
      is_removed: true,
      removed_reason: 'Removed by moderator',
    }).eq('id', c.id);
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction('remove_comment', 'comment', c.id, { body: c.body });
    toast('Comment removed.', 'success');
    load();
  }

  async function restoreComment(c: Comment) {
    const { error } = await supabase.from('comments').update({ is_removed: false, removed_reason: null }).eq('id', c.id);
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction('restore_comment', 'comment', c.id);
    toast('Comment restored.', 'success');
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Moderation</h1>

      <div className="mb-4 flex gap-1 rounded-lg bg-ink-100 p-1 dark:bg-ink-800 sm:w-fit">
        <button onClick={() => setTab('statements')} className={cn('flex flex-1 items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium sm:flex-none', tab === 'statements' ? 'bg-white text-ink-900 shadow-soft dark:bg-ink-700 dark:text-white' : 'text-ink-500')}>
          <FileText size={15} /> Statements
        </button>
        <button onClick={() => setTab('comments')} className={cn('flex flex-1 items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium sm:flex-none', tab === 'comments' ? 'bg-white text-ink-900 shadow-soft dark:bg-ink-700 dark:text-white' : 'text-ink-500')}>
          <MessageCircle size={15} /> Comments
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ink-400" size={24} /></div>
      ) : tab === 'statements' ? (
        <div className="space-y-2">
          {statements.length === 0 ? <p className="card p-8 text-center text-sm text-ink-400">No statements.</p> : statements.map((s) => (
            <div key={s.id} className={cn('card flex items-start gap-3 p-4', s.status === 'removed' && 'opacity-60')}>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className={cn('chip', s.status === 'removed' ? 'bg-drag-500/10 text-drag-600' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400')}>{s.status}</span>
                  <span className="text-xs text-ink-400">{s.category?.name} · {timeAgo(s.created_at)}</span>
                </div>
                <p className="text-sm font-medium text-ink-900 dark:text-white">{s.body}</p>
                <p className="mt-0.5 text-xs text-ink-400">by {s.author?.display_name ?? 'Unknown'} · {s.total_votes} votes · {s.comment_count} comments</p>
              </div>
              <div className="flex gap-1">
                {s.status === 'removed' ? (
                  <button onClick={() => restoreStatement(s)} className="btn-ghost text-xs"><RotateCcw size={14} /> Restore</button>
                ) : (
                  <button onClick={() => removeStatement(s)} className="btn-ghost text-xs text-drag-600"><Trash2 size={14} /> Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {comments.length === 0 ? <p className="card p-8 text-center text-sm text-ink-400">No comments.</p> : comments.map((c) => (
            <div key={c.id} className={cn('card flex items-start gap-3 p-4', c.is_removed && 'opacity-60')}>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  {c.is_removed && <span className="chip bg-drag-500/10 text-drag-600">Removed</span>}
                  <span className="text-xs text-ink-400">{c.author?.display_name} · {timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-ink-700 dark:text-ink-200">{c.body}</p>
                <p className="mt-0.5 text-xs text-ink-400">on: "{(c as Comment & { statement?: { body: string } }).statement?.body?.slice(0, 60)}…"</p>
              </div>
              <div className="flex gap-1">
                {c.is_removed ? (
                  <button onClick={() => restoreComment(c)} className="btn-ghost text-xs"><RotateCcw size={14} /> Restore</button>
                ) : (
                  <button onClick={() => removeComment(c)} className="btn-ghost text-xs text-drag-600"><Trash2 size={14} /> Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
