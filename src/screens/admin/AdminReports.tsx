import { useEffect, useState } from 'react';
import { Flag, Check, X, Loader2, FileText, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { cn, timeAgo, formatDate } from '@/lib/utils';
import { logAdminAction } from '@/screens/AdminDashboard';
import type { Report, Profile } from '@/lib/types';

export function AdminReports() {
  const toast = useToast();
  const [reports, setReports] = useState<(Report & { reporter?: Profile | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'actioned' | 'dismissed' | 'all'>('open');

  async function load() {
    setLoading(true);
    let q = supabase.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(*)').order('created_at', { ascending: false }).limit(50);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setReports((data as (Report & { reporter?: Profile | null })[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function decide(r: Report, status: 'actioned' | 'dismissed') {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('reports').update({
      status,
      decided_by: user?.id,
      decided_at: new Date().toISOString(),
      decision: status === 'actioned' ? 'Content removed' : 'No violation',
    }).eq('id', r.id);
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction(status === 'actioned' ? 'report_actioned' : 'report_dismissed', r.target_type, r.target_id, { reason: r.reason });
    toast(status === 'actioned' ? 'Report actioned.' : 'Report dismissed.', 'success');
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Reports</h1>

      <div className="mb-4 flex gap-1 rounded-lg bg-ink-100 p-1 dark:bg-ink-800 sm:w-fit">
        {(['open', 'actioned', 'dismissed', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors sm:flex-none', filter === f ? 'bg-white text-ink-900 shadow-soft dark:bg-ink-700 dark:text-white' : 'text-ink-500')}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ink-400" size={24} /></div>
      ) : reports.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-400">No reports in this view.</div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', r.status === 'open' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-ink-100 text-ink-400 dark:bg-ink-800')}>
                  {r.target_type === 'statement' ? <FileText size={17} /> : <MessageCircle size={17} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="chip bg-drag-500/10 text-drag-600">{r.reason}</span>
                    <span className="text-xs capitalize text-ink-400">{r.target_type}</span>
                    <span className={cn('chip ml-auto', r.status === 'open' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-ink-100 text-ink-400 dark:bg-ink-800')}>{r.status}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-700 dark:text-ink-200">
                    Reported by <span className="font-medium">{r.reporter?.display_name ?? 'Anonymous'}</span> · {timeAgo(r.created_at)}
                  </p>
                  {r.detail && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{r.detail}</p>}
                  {r.decision && <p className="mt-1 text-xs text-ink-400">Decision: {r.decision} · {formatDate(r.decided_at)}</p>}
                  {r.status === 'open' && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => decide(r, 'actioned')} className="btn-secondary text-xs"><Check size={14} /> Action</button>
                      <button onClick={() => decide(r, 'dismissed')} className="btn-ghost text-xs"><X size={14} /> Dismiss</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
