import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Fuel, Anchor, FileText, MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { StatementCard } from '@/components/StatementCard';
import { compactNumber, formatDate } from '@/lib/utils';
import type { Profile, Statement } from '@/lib/types';

export function ProfileScreen({ yevoxId, navigate }: { yevoxId: string; navigate: (to: string) => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'statements' | 'comments'>('statements');

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('yevox_id', yevoxId).maybeSingle();
      if (!p) { setLoading(false); return; }
      setProfile(p as Profile);
      const [sRes, cRes] = await Promise.all([
        supabase
          .from('statements')
          .select('*, category:categories(*)')
          .eq('author_id', (p as Profile).id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('author_id', (p as Profile).id),
      ]);
      setStatements((sRes.data as Statement[]) ?? []);
      setCommentCount(cRes.count ?? 0);
      setLoading(false);
    })();
  }, [yevoxId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ink-400" size={28} /></div>;
  if (!profile) return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <p className="text-sm text-ink-400">User not found.</p>
      <button onClick={() => navigate('/')} className="btn-secondary mt-4">Home</button>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => navigate('/')} className="btn-ghost mb-4 -ml-2"><ArrowLeft size={16} /> Back</button>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <Avatar name={profile.display_name} id={profile.id} size={64} />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-ink-900 dark:text-white">{profile.display_name}</h1>
            <p className="text-sm text-ink-400">Yevox ID: {profile.yevox_id}</p>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-ink-500 dark:text-ink-400">
              <MapPin size={14} /> {profile.city}, {profile.country}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ProfileStat icon={FileText} label="Statements" value={compactNumber(statements.length)} />
          <ProfileStat icon={MessageCircle} label="Comments" value={compactNumber(commentCount)} />
          <ProfileStat icon={Fuel} label="Fuel received" value={compactNumber(profile.total_fuel)} />
          <ProfileStat icon={Anchor} label="Drag received" value={compactNumber(profile.total_drag)} />
        </div>
        <p className="mt-4 text-center text-xs text-ink-400">Joined {formatDate(profile.created_at)}</p>
      </div>

      <div className="mt-6">
        <div className="mb-4 flex items-center gap-1 rounded-lg bg-ink-100 p-1 dark:bg-ink-800 sm:w-fit">
          <TabButton active={tab === 'statements'} onClick={() => setTab('statements')}>Statements</TabButton>
          <TabButton active={tab === 'comments'} onClick={() => setTab('comments')}>Comments</TabButton>
        </div>

        {tab === 'statements' ? (
          statements.length === 0 ? (
            <div className="card p-8 text-center text-sm text-ink-400">No statements yet.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {statements.map((s) => (
                <StatementCard key={s.id} statement={s} onOpen={(id) => navigate(`/statement/${id}`)} onNavigate={navigate} showResults={s.status === 'turbo' || s.status === 'archive'} />
              ))}
            </div>
          )
        ) : (
          <div className="card p-8 text-center text-sm text-ink-400">Comment history is not publicly emphasised on Yevox.</div>
        )}
      </div>
    </div>
  );
}

function ProfileStat({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3 text-center dark:bg-ink-800/50">
      <Icon size={16} className="mx-auto mb-1 text-ink-400" />
      <p className="text-lg font-bold text-ink-900 dark:text-white">{value}</p>
      <p className="text-xs text-ink-400">{label}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none ${active ? 'bg-white text-ink-900 shadow-soft dark:bg-ink-700 dark:text-white' : 'text-ink-500'}`}
    >
      {children}
    </button>
  );
}
