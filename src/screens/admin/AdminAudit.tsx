import { useEffect, useState } from 'react';
import { ScrollText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { timeAgo, formatDate } from '@/lib/utils';
import type { AuditEntry, Profile } from '@/lib/types';

export function AdminAudit() {
  const [entries, setEntries] = useState<(AuditEntry & { admin?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('audit_log')
        .select('*, admin:profiles!audit_log_admin_id_fkey(*)')
        .order('created_at', { ascending: false })
        .limit(100);
      setEntries((data as (AuditEntry & { admin?: Profile })[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Audit log</h1>
      <p className="mb-4 text-sm text-ink-400">Every admin action is permanently recorded here.</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ink-400" size={24} /></div>
      ) : entries.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <ScrollText className="mb-2 text-ink-300" size={28} />
          <p className="text-sm text-ink-400">No admin actions logged yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="card flex items-center gap-3 p-4">
              {e.admin && <Avatar name={e.admin.display_name} id={e.admin.id} size={32} />}
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-900 dark:text-white">
                  <span className="text-brand-600 dark:text-brand-400">{e.action.replace(/_/g, ' ')}</span>
                  {e.target_type && <span className="text-ink-400"> · {e.target_type}</span>}
                </p>
                <p className="text-xs text-ink-400">
                  by {e.admin?.display_name ?? 'Unknown'} · {formatDate(e.created_at)} ({timeAgo(e.created_at)})
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
