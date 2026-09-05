import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Flag, Shield, FolderTree, Settings as SettingsIcon,
  Database, ScrollText, Menu, X, TrendingUp, MessageCircle, Zap, UserPlus, FileText, Activity, Globe,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { AdminOverview } from '@/screens/admin/AdminOverview';
import { AdminUsers } from '@/screens/admin/AdminUsers';
import { AdminModeration } from '@/screens/admin/AdminModeration';
import { AdminReports } from '@/screens/admin/AdminReports';
import { AdminCategories } from '@/screens/admin/AdminCategories';
import { AdminGeo } from '@/screens/admin/AdminGeo';
import { AdminSettings } from '@/screens/admin/AdminSettings';
import { AdminSeed } from '@/screens/admin/AdminSeed';
import { AdminAudit } from '@/screens/admin/AdminAudit';

type AdminTab = 'overview' | 'users' | 'moderation' | 'reports' | 'categories' | 'geo' | 'settings' | 'seed' | 'audit';

const TABS: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'moderation', label: 'Moderation', icon: Shield },
  { id: 'reports', label: 'Reports', icon: Flag },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'geo', label: 'Geography', icon: Globe },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'seed', label: 'Seed Manager', icon: Database },
  { id: 'audit', label: 'Audit Log', icon: ScrollText },
];

export function AdminDashboard({ navigate }: { navigate: (to: string) => void }) {
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <div className="flex justify-center py-20"><Activity className="animate-spin text-ink-400" /></div>;
  if (!isAdmin) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <Shield className="mx-auto mb-3 text-ink-300" size={32} />
        <p className="text-sm text-ink-500">You don't have access to the admin dashboard.</p>
        <button onClick={() => navigate('/')} className="btn-secondary mt-4">Back to home</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Mobile header */}
      <div className="mb-4 flex items-center justify-between md:hidden">
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Admin</h1>
        <button onClick={() => setSidebarOpen(true)} className="btn-ghost h-9 w-9 p-0"><Menu size={18} /></button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 transform border-r border-ink-200 bg-white p-4 transition-transform dark:border-ink-800 dark:bg-ink-900 md:relative md:z-auto md:translate-x-0 md:border-0 md:bg-transparent md:p-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}>
          <div className="mb-4 flex items-center justify-between md:hidden">
            <span className="font-bold text-ink-900 dark:text-white">Admin</span>
            <button onClick={() => setSidebarOpen(false)} className="btn-ghost h-8 w-8 p-0"><X size={16} /></button>
          </div>
          <nav className="space-y-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setSidebarOpen(false); }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    tab === t.id
                      ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                      : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800',
                  )}
                >
                  <Icon size={16} /> {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {sidebarOpen && <div className="fixed inset-0 z-40 bg-ink-950/40 md:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Content */}
        <div className="min-w-0 flex-1">
          {tab === 'overview' && <AdminOverview />}
          {tab === 'users' && <AdminUsers />}
          {tab === 'moderation' && <AdminModeration />}
          {tab === 'reports' && <AdminReports />}
          {tab === 'categories' && <AdminCategories />}
        {tab === 'geo' && <AdminGeo />}
          {tab === 'settings' && <AdminSettings />}
          {tab === 'seed' && <AdminSeed />}
          {tab === 'audit' && <AdminAudit />}
        </div>
      </div>
    </div>
  );
}

// Shared admin helpers
export async function logAdminAction(action: string, targetType?: string, targetId?: string, detail?: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('audit_log').insert({
    admin_id: user.id,
    action,
    target_type: targetType,
    target_id: targetId,
    detail: detail ?? null,
  });
}

export function StatCard({ icon: Icon, label, value, color = 'text-ink-700 dark:text-ink-200' }: { icon: typeof Users; label: string; value: string | number; color?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Icon size={18} className={color} />
        <span className="text-sm text-ink-500 dark:text-ink-400">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-ink-900 dark:text-white">{value}</p>
    </div>
  );
}
