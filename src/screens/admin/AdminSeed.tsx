import { useState } from 'react';
import { Database, Loader2, AlertTriangle, Check, Trash2, Sparkles } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';

const SEED_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yevox-seed`;

export function AdminSeed() {
  const toast = useToast();
  const [counts, setCounts] = useState({ users: 12, statements: 25, votes: 200, comments: 60, replies: 25, notifications: 20 });
  const [running, setRunning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const headers = {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  async function generate() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`${SEED_URL}?action=generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(counts),
      });
      if (!res.ok) throw new Error(`Seed failed (${res.status})`);
      const data = await res.json();
      setResult(data.message ?? 'Seed data generated successfully.');
      toast('Demo data generated.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Seed generation failed.', 'error');
    }
    setRunning(false);
  }

  async function reset() {
    setResetting(true);
    try {
      const res = await fetch(`${SEED_URL}?action=reset`, { method: 'POST', headers });
      if (!res.ok) throw new Error(`Reset failed (${res.status})`);
      const data = await res.json();
      setResult(data.message ?? 'All seed data deleted.');
      toast('Seed data cleared.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Reset failed.', 'error');
    }
    setResetting(false);
  }

  const FIELDS: { key: keyof typeof counts; label: string; max: number }[] = [
    { key: 'users', label: 'Users', max: 50 },
    { key: 'statements', label: 'Statements', max: 100 },
    { key: 'votes', label: 'Votes', max: 500 },
    { key: 'comments', label: 'Comments', max: 200 },
    { key: 'replies', label: 'Replies', max: 100 },
    { key: 'notifications', label: 'Notifications', max: 50 },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Seed Manager</h1>

      <div className="card mb-5 flex items-start gap-3 border-amber-200/60 bg-amber-50/40 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Development tool</p>
          <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400/80">This generates realistic demo data for testing. It is disabled in production. Generated content is tagged and can be bulk-deleted.</p>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400/80">Generating also creates an admin account: <span className="font-mono font-semibold">admin123@yevox.local</span> / <span className="font-mono font-semibold">#changeMe125</span></p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink-900 dark:text-white"><Sparkles size={18} /> Generate demo data</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input
                type="range"
                min={f.key === 'users' ? 3 : f.key === 'notifications' ? 5 : 10}
                max={f.max}
                value={counts[f.key]}
                onChange={(e) => setCounts({ ...counts, [f.key]: Number(e.target.value) })}
                className="w-full accent-brand-500"
              />
              <p className="mt-1 text-center text-lg font-bold text-ink-900 dark:text-white">{counts[f.key]}</p>
            </div>
          ))}
        </div>

        <button onClick={generate} disabled={running} className="btn-primary mt-5 w-full">
          {running ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} Generate demo data
        </button>
      </div>

      <div className="card mt-4 border-drag-500/30 p-5">
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-drag-600"><Trash2 size={18} /> Reset demo database</h2>
        <p className="mb-4 text-sm text-ink-400">Removes all generated seed content. This does not affect real user accounts or genuine content.</p>
        <button onClick={reset} disabled={resetting} className="btn border border-drag-500/30 text-drag-600 hover:bg-drag-500/10">
          {resetting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete all seed data
        </button>
      </div>

      {result && (
        <div className={cn('card mt-4 flex items-start gap-3 p-4', 'border-brand-200/60 bg-brand-50/40 dark:border-brand-800/40 dark:bg-brand-950/20')}>
          <Check size={18} className="mt-0.5 shrink-0 text-brand-600" />
          <p className="text-sm text-ink-700 dark:text-ink-200">{result}</p>
        </div>
      )}
    </div>
  );
}
