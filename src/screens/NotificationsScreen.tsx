import { useEffect, useState } from 'react';
import { Bell, Zap, Flame, Reply, AlertCircle, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { cn, timeAgo } from '@/lib/utils';
import type { Notification } from '@/lib/types';

const ICONS: Record<string, typeof Zap> = {
  turbo: Zap,
  stalled: Flame,
  reply: Reply,
  fuel: Check,
  drag: AlertCircle,
  moderation: AlertCircle,
};

export function NotificationsScreen({ navigate }: { navigate: (to: string) => void }) {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setNotifs((data as Notification[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  async function open(n: Notification) {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    if (n.link) navigate(n.link);
  }

  async function markAll() {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifs((prev) => prev.map((x) => ({ ...x, is_read: true })));
  }

  if (!user) {
    return <div className="card mx-auto max-w-md p-8 text-center"><p className="text-sm text-ink-500">Sign in to see notifications.</p></div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Notifications</h1>
        {notifs.some((n) => !n.is_read) && (
          <button onClick={markAll} className="btn-ghost text-sm">Mark all read</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-ink-400" size={24} /></div>
      ) : notifs.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-center">
          <Bell className="mb-3 text-ink-300" size={28} />
          <p className="text-sm text-ink-400">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <button
                key={n.id}
                onClick={() => open(n)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/50',
                  n.is_read
                    ? 'border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900'
                    : 'border-brand-200/60 bg-brand-50/40 dark:border-brand-800/40 dark:bg-brand-950/15',
                )}
              >
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', n.is_read ? 'bg-ink-100 text-ink-400 dark:bg-ink-800' : 'bg-brand-100 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400')}>
                  <Icon size={17} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{n.body}</p>}
                  <p className="mt-1 text-xs text-ink-400">{timeAgo(n.created_at)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
