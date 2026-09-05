import { useEffect, useState } from 'react';
import { Search, Ban, Pause, Play, Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { Avatar } from '@/components/Avatar';
import { Modal } from '@/components/Modal';
import { cn, formatDate } from '@/lib/utils';
import { logAdminAction } from '@/screens/AdminDashboard';
import type { Profile } from '@/lib/types';

export function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);

  async function load() {
    setLoading(true);
    let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
    if (query.trim()) {
      q = q.or(`display_name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%,yevox_id.ilike.%${query.trim()}%`);
    }
    const { data } = await q;
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleSuspend(u: Profile) {
    const newVal = !u.is_suspended;
    const { error } = await supabase.from('profiles').update({ is_suspended: newVal }).eq('id', u.id);
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction(newVal ? 'suspend_user' : 'restore_user', 'user', u.id, { display_name: u.display_name });
    toast(newVal ? 'User suspended.' : 'User restored.', 'success');
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_suspended: newVal } : x)));
    setSelected((s) => (s && s.id === u.id ? { ...s, is_suspended: newVal } : s));
  }

  async function toggleBan(u: Profile) {
    const newVal = !u.is_banned;
    const { error } = await supabase.from('profiles').update({ is_banned: newVal }).eq('id', u.id);
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction(newVal ? 'ban_user' : 'unban_user', 'user', u.id, { display_name: u.display_name });
    toast(newVal ? 'User banned.' : 'User unbanned.', 'success');
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_banned: newVal } : x)));
    setSelected((s) => (s && s.id === u.id ? { ...s, is_banned: newVal } : s));
  }

  async function setRole(u: Profile, role: 'user' | 'moderator' | 'admin') {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id);
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction('change_role', 'user', u.id, { role });
    toast('Role updated.', 'success');
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
    setSelected((s) => (s && s.id === u.id ? { ...s, role } : s));
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">User management</h1>

      <div className="relative mb-4">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input pl-11" placeholder="Search by name, email, or Yevox ID…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ink-400" size={24} /></div>
      ) : users.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-400">No users found.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase text-ink-400 dark:border-ink-800 dark:bg-ink-800/50">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Location</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.display_name} id={u.id} size={32} />
                      <div>
                        <p className="font-medium text-ink-900 dark:text-white">{u.display_name}</p>
                        <p className="text-xs text-ink-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-500 dark:text-ink-400 sm:table-cell">{u.city}, {u.country}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={cn('chip', u.role === 'admin' ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400' : u.role === 'moderator' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400')}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_banned ? <span className="chip bg-drag-500/10 text-drag-600">Banned</span> : u.is_suspended ? <span className="chip bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">Suspended</span> : <span className="chip bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">Active</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelected(u)} className="btn-ghost text-xs">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Manage user" size="md">
        {selected && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={selected.display_name} id={selected.id} size={48} />
              <div>
                <p className="font-semibold text-ink-900 dark:text-white">{selected.display_name}</p>
                <p className="text-sm text-ink-400">{selected.email} · {selected.yevox_id}</p>
                <p className="text-xs text-ink-400">Joined {formatDate(selected.created_at)}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Role</label>
              <div className="flex gap-2">
                {(['user', 'moderator', 'admin'] as const).map((r) => (
                  <button key={r} onClick={() => setRole(selected, r)} className={cn('flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors', selected.role === r ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300' : 'border-ink-200 text-ink-500 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800')}>{r}</button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <button onClick={() => toggleSuspend(selected)} className={cn('flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors', selected.is_suspended ? 'border-brand-500/30 text-brand-600 hover:bg-brand-50' : 'border-amber-500/30 text-amber-600 hover:bg-amber-50')}>
                {selected.is_suspended ? <><Play size={16} /> Restore account</> : <><Pause size={16} /> Suspend user</>}
              </button>
              <button onClick={() => toggleBan(selected)} className={cn('flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors', selected.is_banned ? 'border-brand-500/30 text-brand-600 hover:bg-brand-50' : 'border-drag-500/30 text-drag-600 hover:bg-drag-500/5')}>
                {selected.is_banned ? <><Play size={16} /> Unban user</> : <><Ban size={16} /> Ban permanently</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
