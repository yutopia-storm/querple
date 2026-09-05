import { useEffect, useState } from 'react';
import { Save, Loader2, ToggleLeft, ToggleRight, Type, Palette, Home, Megaphone, Bell, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { cn } from '@/lib/utils';
import { logAdminAction } from '@/screens/AdminDashboard';
import type { FeatureFlag } from '@/lib/types';

type Section = 'system' | 'branding' | 'home' | 'features' | 'announcement' | 'pages';

export function AdminSettings() {
  const toast = useToast();
  const [section, setSection] = useState<Section>('system');
  const [settings, setSettings] = useState<Record<string, Record<string, unknown>>>({});
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [pages, setPages] = useState<{ slug: string; title: string; content: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // editable local copies
  const [sysValues, setSysValues] = useState<Record<string, number>>({});
  const [branding, setBranding] = useState({ platformName: 'Yevox', tagline: '' });
  const [home, setHome] = useState({ headline: '', subheading: '' });
  const [ann, setAnn] = useState({ title: '', body: '', color: '#10b981', is_dismissible: true });
  const [editingPage, setEditingPage] = useState<{ slug: string; title: string; content: string } | null>(null);

  async function load() {
    const [sRes, fRes, pRes] = await Promise.all([
      supabase.from('platform_settings').select('*'),
      supabase.from('feature_flags').select('*'),
      supabase.from('informational_pages').select('*').order('slug'),
    ]);
    const sMap: Record<string, Record<string, unknown>> = {};
    (sRes.data as { key: string; value: Record<string, unknown> }[] ?? []).forEach((s) => (sMap[s.key] = s.value));
    setSettings(sMap);
    setFlags((fRes.data as FeatureFlag[]) ?? []);
    setPages((pRes.data as { slug: string; title: string; content: string }[]) ?? []);

    const sv: Record<string, number> = {};
    ['turbo_threshold', 'turbo_duration_days', 'stall_duration_days', 'max_statement_length', 'max_reasoning_length', 'max_comment_length', 'max_thread_depth', 'statement_limit_per_day'].forEach((k) => {
      sv[k] = (sMap[k]?.value as number) ?? 0;
    });
    setSysValues(sv);
    setBranding((sMap['branding'] as unknown as { platformName: string; tagline: string }) ?? { platformName: 'Yevox', tagline: '' });
    setHome((sMap['home'] as unknown as { headline: string; subheading: string }) ?? { headline: '', subheading: '' });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveSetting(key: string, value: Record<string, unknown>) {
    setSaving(true);
    const { error } = await supabase.from('platform_settings').upsert({ key, value, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) toast(error.message, 'error');
    else { toast('Saved.', 'success'); await logAdminAction('update_setting', 'platform_settings', undefined, { key }); }
  }

  async function toggleFlag(f: FeatureFlag) {
    const newVal = !f.is_enabled;
    const { error } = await supabase.from('feature_flags').update({ is_enabled: newVal, updated_at: new Date().toISOString() }).eq('key', f.key);
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction('toggle_feature', 'feature_flag', undefined, { key: f.key, enabled: newVal });
    toast(`${f.key} ${newVal ? 'enabled' : 'disabled'}.`, 'success');
    setFlags((prev) => prev.map((x) => (x.key === f.key ? { ...x, is_enabled: newVal } : x)));
  }

  async function publishAnnouncement() {
    if (!ann.title.trim()) { toast('Announcement needs a title.', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('announcements').insert({
      title: ann.title,
      body: ann.body || null,
      color: ann.color,
      is_dismissible: ann.is_dismissible,
      is_active: true,
    });
    setSaving(false);
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction('publish_announcement', 'announcement', undefined, { title: ann.title });
    toast('Announcement published.', 'success');
    setAnn({ title: '', body: '', color: '#10b981', is_dismissible: true });
  }

  async function savePage() {
    if (!editingPage) return;
    setSaving(true);
    const { error } = await supabase.from('informational_pages').upsert({
      slug: editingPage.slug,
      title: editingPage.title,
      content: editingPage.content,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast(error.message, 'error'); return; }
    await logAdminAction('update_page', 'informational_page', undefined, { slug: editingPage.slug });
    toast('Page saved.', 'success');
    setEditingPage(null);
    load();
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ink-400" size={24} /></div>;

  const SECTIONS: { id: Section; label: string; icon: typeof Type }[] = [
    { id: 'system', label: 'System', icon: Shield },
    { id: 'branding', label: 'Branding', icon: Type },
    { id: 'home', label: 'Home Page', icon: Home },
    { id: 'features', label: 'Feature Flags', icon: ToggleLeft },
    { id: 'announcement', label: 'Announcements', icon: Megaphone },
    { id: 'pages', label: 'Pages', icon: Palette },
  ];

  const SYS_FIELDS: { key: string; label: string }[] = [
    { key: 'turbo_threshold', label: 'Turbo threshold (votes)' },
    { key: 'turbo_duration_days', label: 'Turbo duration (days)' },
    { key: 'stall_duration_days', label: 'Stall duration (days)' },
    { key: 'max_statement_length', label: 'Max statement length' },
    { key: 'max_reasoning_length', label: 'Max reasoning length' },
    { key: 'max_comment_length', label: 'Max comment length' },
    { key: 'max_thread_depth', label: 'Max thread depth' },
    { key: 'statement_limit_per_day', label: 'Statements per user per day' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Platform settings</h1>

      <div className="mb-5 flex flex-wrap gap-1 rounded-lg bg-ink-100 p-1 dark:bg-ink-800">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setSection(s.id)} className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', section === s.id ? 'bg-white text-ink-900 shadow-soft dark:bg-ink-700 dark:text-white' : 'text-ink-500')}>
              <Icon size={15} /> {s.label}
            </button>
          );
        })}
      </div>

      {section === 'system' && (
        <div className="card max-w-2xl space-y-4 p-5">
          {SYS_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between">
              <label className="text-sm text-ink-700 dark:text-ink-200">{f.label}</label>
              <input
                type="number"
                className="input w-24 text-right"
                value={sysValues[f.key]}
                onChange={(e) => setSysValues((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))}
              />
            </div>
          ))}
          <button onClick={() => saveSetting('turbo_threshold', { value: sysValues.turbo_threshold })} disabled={saving} className="btn-primary">
            <Save size={16} /> Save all system settings
          </button>
        </div>
      )}

      {section === 'branding' && (
        <div className="card max-w-2xl space-y-4 p-5">
          <div>
            <label className="label">Platform name</label>
            <input className="input" value={branding.platformName} onChange={(e) => setBranding({ ...branding, platformName: e.target.value })} />
          </div>
          <div>
            <label className="label">Tagline</label>
            <input className="input" value={branding.tagline} onChange={(e) => setBranding({ ...branding, tagline: e.target.value })} />
          </div>
          <button onClick={() => saveSetting('branding', branding)} disabled={saving} className="btn-primary"><Save size={16} /> Save branding</button>
        </div>
      )}

      {section === 'home' && (
        <div className="card max-w-2xl space-y-4 p-5">
          <div>
            <label className="label">Hero headline</label>
            <textarea className="input min-h-[60px]" value={home.headline} onChange={(e) => setHome({ ...home, headline: e.target.value })} />
          </div>
          <div>
            <label className="label">Hero subheading</label>
            <textarea className="input min-h-[80px]" value={home.subheading} onChange={(e) => setHome({ ...home, subheading: e.target.value })} />
          </div>
          <button onClick={() => saveSetting('home', home)} disabled={saving} className="btn-primary"><Save size={16} /> Save home content</button>
        </div>
      )}

      {section === 'features' && (
        <div className="card max-w-2xl divide-y divide-ink-100 dark:divide-ink-800">
          {flags.map((f) => (
            <div key={f.key} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium capitalize text-ink-900 dark:text-white">{f.key.replace(/_/g, ' ')}</p>
              </div>
              <button onClick={() => toggleFlag(f)}>
                {f.is_enabled ? <ToggleRight className="text-brand-500" size={32} /> : <ToggleLeft className="text-ink-300" size={32} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {section === 'announcement' && (
        <div className="card max-w-2xl space-y-4 p-5">
          <div>
            <label className="label">Announcement title</label>
            <input className="input" value={ann.title} onChange={(e) => setAnn({ ...ann, title: e.target.value })} placeholder="Scheduled maintenance on Friday…" />
          </div>
          <div>
            <label className="label">Body (optional)</label>
            <input className="input" value={ann.body} onChange={(e) => setAnn({ ...ann, body: e.target.value })} placeholder="Details about the announcement…" />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="label">Colour</label>
              <input type="color" className="h-10 w-16 rounded-lg border border-ink-200 dark:border-ink-700" value={ann.color} onChange={(e) => setAnn({ ...ann, color: e.target.value })} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
              <input type="checkbox" checked={ann.is_dismissible} onChange={(e) => setAnn({ ...ann, is_dismissible: e.target.checked })} />
              Dismissible
            </label>
          </div>
          <button onClick={publishAnnouncement} disabled={saving} className="btn-primary"><Megaphone size={16} /> Publish announcement</button>
        </div>
      )}

      {section === 'pages' && (
        <div className="space-y-2">
          {pages.map((p) => (
            <div key={p.slug} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-medium capitalize text-ink-900 dark:text-white">{p.title}</p>
                <p className="text-xs text-ink-400">/{p.slug}</p>
              </div>
              <button onClick={() => setEditingPage({ ...p })} className="btn-secondary text-xs">Edit</button>
            </div>
          ))}
          {editingPage && (
            <div className="card mt-4 space-y-3 p-5">
              <input className="input font-semibold" value={editingPage.title} onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })} />
              <textarea className="input min-h-[200px] resize-y" value={editingPage.content} onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })} />
              <div className="flex gap-2">
                <button onClick={() => setEditingPage(null)} className="btn-ghost">Cancel</button>
                <button onClick={savePage} disabled={saving} className="btn-primary"><Save size={16} /> Save page</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
