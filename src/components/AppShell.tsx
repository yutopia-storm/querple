import { useState, type ReactNode } from 'react';
import {
  Flame, Zap, TrendingUp, Archive, Search, Bell, Plus, User as UserIcon,
  Sun, Moon, Menu, X, Settings, Shield, LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePlatform } from '@/hooks/usePlatform';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/Avatar';
import { LocationDropdown } from '@/components/LocationDropdown';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Notification, Announcement } from '@/lib/types';

interface NavItem {
  label: string;
  path: string;
  icon: typeof Flame;
  flag?: string;
}

const NAV: NavItem[] = [
  { label: 'Live', path: '/', icon: Flame },
  { label: 'Turbo', path: '/turbo', icon: Zap, flag: 'turbo' },
  { label: 'Trending', path: '/trending', icon: TrendingUp, flag: 'trending' },
  { label: 'Archive', path: '/archive', icon: Archive, flag: 'archive' },
  { label: 'Search', path: '/search', icon: Search, flag: 'search' },
];

export function AppShell({
  path,
  navigate,
  children,
}: {
  path: string;
  navigate: (to: string) => void;
  children: ReactNode;
}) {
  const { profile, isAdmin, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const platform = usePlatform();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  const isActive = (p: string) => (p === '/' ? path === '/' : path.startsWith(p));

  async function openNotifs() {
    if (!notifOpen && profile) {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifs((data as Notification[]) ?? []);
    }
    setNotifOpen((o) => !o);
  }

  async function markAllRead() {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifs((n) => n.map((x) => ({ ...x, is_read: true })));
  }

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      {/* Announcement banner */}
      {platform.announcements.length > 0 && platform.announcements[0] && (
        <AnnouncementBar ann={platform.announcements[0]} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-ink-200/80 bg-white/80 backdrop-blur-lg dark:border-ink-800/80 dark:bg-ink-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <button onClick={() => navigate('/')} className="mr-1 flex items-center sm:mr-2">
            <Logo />
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.filter((n) => !n.flag || platform.flags[n.flag] !== false).map((n) => {
              const Icon = n.icon;
              return (
                <button
                  key={n.path}
                  onClick={() => navigate(n.path)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive(n.path)
                      ? 'bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-white'
                      : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-900 dark:hover:text-white',
                  )}
                >
                  <Icon size={16} />
                  {n.label}
                </button>
              );
            })}
          </nav>

          {/* Location selector — inline on far right, blends into nav */}
          <div className="hidden md:block">
            <LocationDropdown variant="nav" />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => navigate('/create')}
              className="btn-accent hidden h-9 px-3.5 text-sm sm:inline-flex"
            >
              <Plus size={16} /> Statement
            </button>
            <button
              onClick={() => navigate('/create')}
              className="btn-accent h-9 w-9 p-0 sm:hidden"
              aria-label="Create statement"
            >
              <Plus size={18} />
            </button>

            <button onClick={openNotifs} className="relative btn-ghost h-9 w-9 p-0" aria-label="Notifications">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-ink-950" />
              )}
            </button>

            <button onClick={toggle} className="btn-ghost h-9 w-9 p-0" aria-label="Toggle theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {profile && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex h-9 w-9 items-center justify-center"
                  aria-label="Profile menu"
                >
                  <Avatar name={profile.display_name} id={profile.id} size={32} />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-11 z-40 w-56 animate-scale-in rounded-xl border border-ink-200 bg-white p-1.5 shadow-float dark:border-ink-800 dark:bg-ink-900">
                      <MenuItem icon={UserIcon} label="Profile" onClick={() => { navigate(`/profile/${profile.yevox_id}`); setMenuOpen(false); }} />
                      <MenuItem icon={Settings} label="Settings" onClick={() => { navigate('/settings'); setMenuOpen(false); }} />
                      {isAdmin && (
                        <MenuItem icon={Shield} label="Admin dashboard" onClick={() => { navigate('/admin'); setMenuOpen(false); }} />
                      )}
                      <div className="my-1 h-px bg-ink-100 dark:bg-ink-800" />
                      <MenuItem icon={LogOut} label="Sign out" onClick={() => { signOut(); navigate('/login'); }} danger />
                    </div>
                  </>
                )}
              </div>
            )}

            <button onClick={() => setMenuOpen(true)} className="btn-ghost h-9 w-9 p-0 md:hidden" aria-label="Menu">
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-ink-200/60 px-3 py-2 dark:border-ink-800/60 md:hidden">
          {NAV.filter((n) => !n.flag || platform.flags[n.flag] !== false).map((n) => {
            const Icon = n.icon;
            return (
              <button
                key={n.path}
                onClick={() => navigate(n.path)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium',
                  isActive(n.path)
                    ? 'bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-white'
                    : 'text-ink-500 dark:text-ink-400',
                )}
              >
                <Icon size={15} /> {n.label}
              </button>
            );
          })}
          {/* Location selector — accessible in mobile menu */}
          <div className="flex shrink-0 items-center pl-1">
            <LocationDropdown variant="nav" />
          </div>
        </nav>
      </header>

      {/* Notifications dropdown */}
      {notifOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)}>
          <div
            className="absolute right-3 top-16 w-80 animate-scale-in rounded-xl border border-ink-200 bg-white p-2 shadow-float dark:border-ink-800 dark:bg-ink-900 sm:right-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-semibold text-ink-900 dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifs.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-ink-400">No notifications yet.</p>
              ) : (
                notifs.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { if (n.link) navigate(n.link); setNotifOpen(false); }}
                    className={cn(
                      'block w-full rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-ink-50 dark:hover:bg-ink-800',
                      !n.is_read && 'bg-brand-50/50 dark:bg-brand-900/10',
                    )}
                  >
                    <p className="text-sm font-medium text-ink-900 dark:text-ink-100">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400 line-clamp-2">{n.body}</p>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:py-8">{children}</main>
    </div>
  );
}

function MenuItem({
  icon: Icon, label, onClick, danger,
}: {
  icon: typeof UserIcon; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
        danger
          ? 'text-drag-600 hover:bg-drag-500/10'
          : 'text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800',
      )}
    >
      <Icon size={16} /> {label}
    </button>
  );
}

function AnnouncementBar({ ann }: { ann: Announcement }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !ann.is_dismissible === undefined) return null;
  return (
    <div
      className="px-4 py-2.5 text-center text-sm"
      style={{ backgroundColor: ann.color ? `${ann.color}18` : undefined, color: ann.color ?? undefined }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2">
        <span className="font-medium text-ink-800 dark:text-ink-100">{ann.title}
          {ann.body && <span className="ml-1.5 text-ink-600 dark:text-ink-300 font-normal">{ann.body}</span>}
        </span>
        {ann.is_dismissible && (
          <button onClick={() => setDismissed(true)} className="text-ink-400 hover:text-ink-600">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
