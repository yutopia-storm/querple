import { useEffect, useState } from 'react';
import { X, Fuel, CalendarDays, FileText, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { Modal } from '@/components/Modal';
import { compactNumber, fuelLabel, formatDate } from '@/lib/utils';
import type { Profile, Statement } from '@/lib/types';

interface AuthorPopupProps {
  authorId: string | null;
  author?: Profile | null;
  onClose: () => void;
  onViewContributions: (yevoxId: string) => void;
}

export function AuthorPopup({ authorId, author: initialAuthor, onClose, onViewContributions }: AuthorPopupProps) {
  const [author, setAuthor] = useState<Profile | null>(initialAuthor ?? null);
  const [statementCount, setStatementCount] = useState(0);
  const [turboCount, setTurboCount] = useState(0);
  const [loading, setLoading] = useState(!initialAuthor);

  useEffect(() => {
    if (!authorId) return;
    let active = true;
    (async () => {
      let prof = initialAuthor;
      if (!prof) {
        const { data } = await supabase.from('profiles').select('*').eq('id', authorId).maybeSingle();
        prof = data as Profile;
      }
      if (!active) return;
      setAuthor(prof);
      const [sRes, tRes] = await Promise.all([
        supabase.from('statements').select('id', { count: 'exact', head: true }).eq('author_id', authorId),
        supabase
          .from('statements')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', authorId)
          .in('status', ['turbo', 'archive']),
      ]);
      if (!active) return;
      setStatementCount(sRes.count ?? 0);
      setTurboCount(tRes.count ?? 0);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [authorId, initialAuthor]);

  if (!authorId) return null;

  return (
    <Modal open={!!authorId} onClose={onClose} size="sm">
      {loading || !author ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="h-10 w-10 animate-pulse rounded-full bg-ink-200 dark:bg-ink-800" />
          <div className="h-4 w-32 animate-pulse rounded bg-ink-200 dark:bg-ink-800" />
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={author.display_name} id={author.id} size={48} />
              <div>
                <h2 className="text-lg font-bold text-ink-900 dark:text-white">{author.display_name}</h2>
                <p className="text-xs text-ink-400">Member since {formatDate(author.created_at)}</p>
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost -mr-2 -mt-1 p-1.5" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <PopupStat icon={Fuel} label="Total Fuel" value={fuelLabel(author.total_fuel)} accent="text-brand-600 dark:text-brand-400" />
            <PopupStat icon={FileText} label="Statements" value={compactNumber(statementCount)} />
            <PopupStat icon={Zap} label="Turbo" value={compactNumber(turboCount)} />
          </div>

          <button
            onClick={() => onViewContributions(author.yevox_id)}
            className="btn-secondary mt-4 w-full justify-center text-sm"
          >
            <CalendarDays size={15} /> View Contributions
          </button>
        </div>
      )}
    </Modal>
  );
}

function PopupStat({ icon: Icon, label, value, accent }: { icon: typeof Fuel; label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3 text-center dark:bg-ink-800/50">
      <Icon size={16} className={`mx-auto mb-1 ${accent ?? 'text-ink-400'}`} />
      <p className={`text-base font-bold ${accent ?? 'text-ink-900 dark:text-white'}`}>{value}</p>
      <p className="text-[11px] text-ink-400">{label}</p>
    </div>
  );
}
