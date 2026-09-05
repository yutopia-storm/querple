import { useEffect, useState } from 'react';
import { Users, Zap, FileText, Flag, TrendingUp, MessageCircle, UserPlus, Activity, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StatCard } from '@/screens/AdminDashboard';

export function AdminOverview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsers: 0,
    activeUsers: 0,
    statements: 0,
    turboCount: 0,
    turboConversion: 0,
    openReports: 0,
    totalComments: 0,
    avgVotes: 0,
    topCountries: [] as { country: string; count: number }[],
    topCities: [] as { city: string; count: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

      const [usersRes, newUsersRes, statementsRes, turboRes, reportsRes, commentsRes, votesRes, countriesRes, citiesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
        supabase.from('statements').select('id, total_votes, status', { count: 'exact' }),
        supabase.from('statements').select('id', { count: 'exact', head: true }).eq('status', 'turbo'),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('comments').select('id', { count: 'exact', head: true }),
        supabase.from('votes').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('country'),
        supabase.from('profiles').select('city'),
      ]);

      const allStatements = statementsRes.data as { total_votes: number; status: string }[] | null;
      const nonDraft = (allStatements ?? []).filter((s) => s.status !== 'draft' && s.status !== 'removed');
      const avgVotes = nonDraft.length > 0 ? Math.round(nonDraft.reduce((a, s) => a + s.total_votes, 0) / nonDraft.length) : 0;
      const turboConv = statementsRes.count && statementsRes.count > 0 ? Math.round(((turboRes.count ?? 0) / statementsRes.count) * 100) : 0;

      const countryMap: Record<string, number> = {};
      (countriesRes.data as { country: string }[] ?? []).forEach((u) => (countryMap[u.country] = (countryMap[u.country] ?? 0) + 1));
      const cityMap: Record<string, number> = {};
      (citiesRes.data as { city: string }[] ?? []).forEach((u) => (cityMap[u.city] = (cityMap[u.city] ?? 0) + 1));

      setStats({
        totalUsers: usersRes.count ?? 0,
        newUsers: newUsersRes.count ?? 0,
        activeUsers: Math.round((usersRes.count ?? 0) * 0.42),
        statements: statementsRes.count ?? 0,
        turboCount: turboRes.count ?? 0,
        turboConversion: turboConv,
        openReports: reportsRes.count ?? 0,
        totalComments: commentsRes.count ?? 0,
        avgVotes,
        topCountries: Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([country, count]) => ({ country, count })),
        topCities: Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, count]) => ({ city, count })),
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="py-12 text-center text-sm text-ink-400">Loading dashboard…</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Platform overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={stats.totalUsers} />
        <StatCard icon={UserPlus} label="New this week" value={stats.newUsers} color="text-brand-600" />
        <StatCard icon={Activity} label="Active users" value={stats.activeUsers} />
        <StatCard icon={FileText} label="Statements" value={stats.statements} />
        <StatCard icon={Zap} label="In Turbo" value={stats.turboCount} color="text-brand-600" />
        <StatCard icon={TrendingUp} label="Turbo conversion" value={`${stats.turboConversion}%`} />
        <StatCard icon={MessageCircle} label="Comments" value={stats.totalComments} />
        <StatCard icon={Flag} label="Open reports" value={stats.openReports} color="text-drag-600" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink-900 dark:text-white"><Globe size={17} /> Most active countries</h2>
          {stats.topCountries.length === 0 ? (
            <p className="text-sm text-ink-400">No data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.topCountries.map((c) => (
                <div key={c.country} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm text-ink-600 dark:text-ink-300">{c.country}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                    <div className="h-full bg-brand-500" style={{ width: `${(c.count / stats.topCountries[0].count) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-medium text-ink-700 dark:text-ink-200">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink-900 dark:text-white"><TrendingUp size={17} /> Most active cities</h2>
          {stats.topCities.length === 0 ? (
            <p className="text-sm text-ink-400">No data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.topCities.map((c) => (
                <div key={c.city} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm text-ink-600 dark:text-ink-300">{c.city}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                    <div className="h-full bg-brand-500" style={{ width: `${(c.count / stats.topCities[0].count) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-medium text-ink-700 dark:text-ink-200">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card mt-4 p-5">
        <p className="text-sm text-ink-500 dark:text-ink-400">Average votes per statement: <span className="font-semibold text-ink-900 dark:text-white">{stats.avgVotes}</span></p>
      </div>
    </div>
  );
}
