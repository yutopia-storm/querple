import { useState, useEffect } from 'react';
import { ArrowLeft, User as UserIcon, Mail, Lock, Bell, Download, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils';
import type { GeoCountry, GeoRegion, GeoLocalArea } from '@/lib/geo';

type Section = 'account' | 'notifications' | 'data';

export function SettingsScreen({ navigate }: { navigate: (to: string) => void }) {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const toast = useToast();
  const [section, setSection] = useState<Section>('account');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [localArea, setLocalArea] = useState(profile?.local_area ?? profile?.city ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [geoCountries, setGeoCountries] = useState<GeoCountry[]>([]);
  const [geoRegions, setGeoRegions] = useState<GeoRegion[]>([]);
  const [geoLocalAreas, setGeoLocalAreas] = useState<GeoLocalArea[]>([]);

  const [newPassword, setNewPassword] = useState('');
  const [emailChange, setEmailChange] = useState(false);

  useEffect(() => {
    (async () => {
      const [c, r, la] = await Promise.all([
        supabase.from('geo_countries').select('*').eq('is_disabled', false).order('sort_order'),
        supabase.from('geo_regions').select('*').eq('is_disabled', false).order('sort_order'),
        supabase.from('geo_local_areas').select('*').eq('is_disabled', false).order('sort_order'),
      ]);
      setGeoCountries((c.data as GeoCountry[]) ?? []);
      setGeoRegions((r.data as GeoRegion[]) ?? []);
      setGeoLocalAreas((la.data as GeoLocalArea[]) ?? []);
    })();
  }, []);

  if (!user || !profile) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-ink-500">Sign in to view settings.</p>
        <button onClick={() => navigate('/login')} className="btn-primary mt-4">Sign in</button>
      </div>
    );
  }

  const cityChangedDays = profile.city_changed_at
    ? Math.floor((Date.now() - new Date(profile.city_changed_at).getTime()) / 86400000)
    : 999;
  const canChangeCity = cityChangedDays >= 90;

  const selectedCountry = geoCountries.find((c) => c.name === profile.country);
  const userRegionName = profile.region ?? null;
  const regionId = geoRegions.find((r) => r.country_id === selectedCountry?.id && r.name === userRegionName)?.id;
  const availableLocalAreas = selectedCountry?.has_regions
    ? geoLocalAreas.filter((la) => la.region_id === regionId)
    : geoLocalAreas.filter((la) => la.country_id === selectedCountry?.id);

  async function saveProfile() {
    setSaving(true);
    const updates: Record<string, string> = { display_name: displayName.trim() };
    if (localArea !== profile!.city && canChangeCity) {
      updates.city = localArea;
      updates.local_area = localArea;
      updates.city_changed_at = new Date().toISOString();
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', user!.id);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast('Profile updated.', 'success'); refreshProfile(); }
  }

  async function changePassword() {
    if (newPassword.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast('Password updated.', 'success'); setNewPassword(''); }
  }

  async function changeEmail() {
    if (!email.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setSaving(false);
    if (error) toast(error.message, 'error');
    else toast('Email update initiated. Verify the new address to complete the change.', 'success');
    setEmailChange(false);
  }

  async function downloadData() {
    const [s, c, v, r] = await Promise.all([
      supabase.from('statements').select('*').eq('author_id', user!.id),
      supabase.from('comments').select('*').eq('author_id', user!.id),
      supabase.from('votes').select('*').eq('user_id', user!.id),
      supabase.from('comment_ratings').select('*').eq('user_id', user!.id),
    ]);
    const payload = {
      profile: profile,
      statements: s.data,
      comments: c.data,
      votes: v.data,
      comment_ratings: r.data,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yevox-data-${profile!.yevox_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Data downloaded.', 'success');
  }

  async function deleteAccount() {
    setSaving(true);
    await supabase.from('profiles').update({
      display_name: 'Deleted user',
      deleted_at: new Date().toISOString(),
      avatar_url: null,
    }).eq('id', user!.id);
    await signOut();
    setSaving(false);
    setDeleteOpen(false);
    toast('Account deleted. Your public content has been anonymised.', 'info');
    navigate('/');
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => navigate('/')} className="btn-ghost mb-4 -ml-2"><ArrowLeft size={16} /> Back</button>
      <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Settings</h1>

      <div className="mt-6 flex gap-1 rounded-lg bg-ink-100 p-1 dark:bg-ink-800 sm:w-fit">
        <Tab active={section === 'account'} onClick={() => setSection('account')} icon={UserIcon}>Account</Tab>
        <Tab active={section === 'notifications'} onClick={() => setSection('notifications')} icon={Bell}>Notifications</Tab>
        <Tab active={section === 'data'} onClick={() => setSection('data')} icon={Download}>Data</Tab>
      </div>

      <div className="mt-6">
        {section === 'account' && (
          <div className="space-y-5">
            <div className="card p-5">
              <h2 className="mb-4 font-semibold text-ink-900 dark:text-white">Profile</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Display name</label>
                  <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Country <span className="font-normal text-ink-400">(locked)</span></label>
                    <input className="input opacity-60" value={profile.country} disabled />
                    <p className="mt-1 text-xs text-ink-400">Contact support to change country — it affects voting eligibility.</p>
                  </div>
                  <div>
                    <label className="label">Local area</label>
                    <select className="input" value={localArea} onChange={(e) => setLocalArea(e.target.value)} disabled={!canChangeCity || availableLocalAreas.length === 0}>
                      <option value="">{availableLocalAreas.length === 0 ? 'No areas available' : 'Select…'}</option>
                      {availableLocalAreas.map((la) => <option key={la.id} value={la.name}>{la.name}</option>)}
                    </select>
                    {!canChangeCity && <p className="mt-1 text-xs text-ink-400">Can change again in {90 - cityChangedDays} days.</p>}
                  </div>
                </div>
                <button onClick={saveProfile} disabled={saving} className="btn-primary">Save profile</button>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink-900 dark:text-white"><Mail size={18} /> Email address</h2>
              <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3.5 py-2.5 dark:bg-ink-800/50">
                <span className="text-sm text-ink-700 dark:text-ink-200">{profile.email}</span>
                {user.emailConfirmed ? (
                  <span className="chip bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">Verified</span>
                ) : (
                  <span className="chip bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">Unverified</span>
                )}
              </div>
              {!emailChange ? (
                <button onClick={() => setEmailChange(true)} className="btn-secondary mt-3">Change email</button>
              ) : (
                <div className="mt-3 space-y-3">
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="New email" />
                  <div className="flex gap-2">
                    <button onClick={() => setEmailChange(false)} className="btn-ghost">Cancel</button>
                    <button onClick={changeEmail} disabled={saving} className="btn-primary">Update email</button>
                  </div>
                </div>
              )}
            </div>

            <div className="card p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink-900 dark:text-white"><Lock size={18} /> Password</h2>
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" />
              <button onClick={changePassword} disabled={saving || !newPassword} className="btn-primary mt-3">Update password</button>
            </div>
          </div>
        )}

        {section === 'notifications' && (
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-ink-900 dark:text-white">Notification preferences</h2>
            <p className="text-sm text-ink-400">You'll be notified when your statement reaches Turbo, someone replies to your comment, or your statement stalls.</p>
            <div className="mt-4 space-y-3">
              {['Statement reached Turbo', 'Statement stalled', 'New reply to your comment', 'Replies in threads you joined'].map((n) => (
                <div key={n} className="flex items-center justify-between rounded-lg border border-ink-200 px-3.5 py-3 dark:border-ink-700">
                  <span className="text-sm text-ink-700 dark:text-ink-200">{n}</span>
                  <Toggle defaultOn />
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'data' && (
          <div className="space-y-5">
            <div className="card p-5">
              <h2 className="mb-2 font-semibold text-ink-900 dark:text-white">Download your data</h2>
              <p className="mb-4 text-sm text-ink-400">Export everything you've created on Yevox as a JSON file.</p>
              <button onClick={downloadData} className="btn-secondary"><Download size={16} /> Download data</button>
            </div>
            <div className="card border-drag-500/30 p-5">
              <h2 className="mb-2 flex items-center gap-2 font-semibold text-drag-600"><AlertTriangle size={18} /> Delete account</h2>
              <p className="mb-4 text-sm text-ink-400">Deleting your account anonymises your public content rather than removing historical discussions. This cannot be undone.</p>
              <button onClick={() => setDeleteOpen(true)} className="btn border border-drag-500/30 text-drag-600 hover:bg-drag-500/10"><Trash2 size={16} /> Delete my account</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete account?" size="sm">
        <p className="text-sm text-ink-500">Your account will be permanently deleted. Your public statements and comments will remain but be attributed to "Deleted user". This cannot be undone.</p>
        <div className="mt-5 flex gap-2">
          <button onClick={() => setDeleteOpen(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={deleteAccount} disabled={saving} className="btn flex-1 border border-drag-500/30 text-drag-600 hover:bg-drag-500/10">Delete forever</button>
        </div>
      </Modal>
    </div>
  );
}

function Tab({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof UserIcon; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none', active ? 'bg-white text-ink-900 shadow-soft dark:bg-ink-700 dark:text-white' : 'text-ink-500')}
    >
      <Icon size={15} /> {children}
    </button>
  );
}

function Toggle({ defaultOn }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      className={cn('relative h-6 w-11 rounded-full transition-colors', on ? 'bg-brand-500' : 'bg-ink-200 dark:bg-ink-700')}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform', on ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}
