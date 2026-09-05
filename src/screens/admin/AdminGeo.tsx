import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Loader2, Globe, MapPin, MapPinned } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils';
import { logAdminAction } from '@/screens/AdminDashboard';
import type { GeoCountry, GeoRegion, GeoLocalArea } from '@/lib/geo';

type Tab = 'countries' | 'regions' | 'local';

export function AdminGeo() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('countries');
  const [countries, setCountries] = useState<GeoCountry[]>([]);
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [localAreas, setLocalAreas] = useState<GeoLocalArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  async function load() {
    setLoading(true);
    const [c, r, la] = await Promise.all([
      supabase.from('geo_countries').select('*').order('sort_order'),
      supabase.from('geo_regions').select('*').order('sort_order'),
      supabase.from('geo_local_areas').select('*').order('sort_order'),
    ]);
    setCountries((c.data as GeoCountry[]) ?? []);
    setRegions((r.data as GeoRegion[]) ?? []);
    setLocalAreas((la.data as GeoLocalArea[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleCountry(c: GeoCountry) {
    await supabase.from('geo_countries').update({ is_disabled: !c.is_disabled }).eq('id', c.id);
    await logAdminAction(c.is_disabled ? 'enable_country' : 'disable_country', 'geo_country', c.id, { name: c.name });
    load();
  }
  async function toggleRegion(r: GeoRegion) {
    await supabase.from('geo_regions').update({ is_disabled: !r.is_disabled }).eq('id', r.id);
    load();
  }
  async function toggleLocal(la: GeoLocalArea) {
    await supabase.from('geo_local_areas').update({ is_disabled: !la.is_disabled }).eq('id', la.id);
    load();
  }
  async function deleteCountry(c: GeoCountry) {
    await supabase.from('geo_countries').delete().eq('id', c.id);
    await logAdminAction('delete_country', 'geo_country', c.id, { name: c.name });
    toast('Country deleted.', 'success');
    load();
  }
  async function deleteRegion(r: GeoRegion) {
    await supabase.from('geo_regions').delete().eq('id', r.id);
    load();
  }
  async function deleteLocal(la: GeoLocalArea) {
    await supabase.from('geo_local_areas').delete().eq('id', la.id);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Geography</h1>
        <button onClick={() => setAddOpen(true)} className="btn-primary"><Plus size={16} /> Add</button>
      </div>

      <div className="mb-5 flex gap-1 rounded-lg bg-ink-100 p-1 dark:bg-ink-800 sm:w-fit">
        <GeoTab active={tab === 'countries'} onClick={() => setTab('countries')} icon={Globe}>Countries</GeoTab>
        <GeoTab active={tab === 'regions'} onClick={() => setTab('regions')} icon={MapPinned}>Regions</GeoTab>
        <GeoTab active={tab === 'local'} onClick={() => setTab('local')} icon={MapPin}>Local areas</GeoTab>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-ink-400" size={24} /></div>
      ) : tab === 'countries' ? (
        <div className="space-y-2">
          {countries.map((c) => (
            <div key={c.id} className="card flex items-center gap-3 p-4">
              <span className="text-xl">{c.flag_emoji}</span>
              <div className="flex-1">
                <p className="font-medium text-ink-900 dark:text-white">{c.name}</p>
                <p className="text-xs text-ink-400">{c.iso_code} · {c.has_regions ? 'Has regions' : 'No regions'}</p>
              </div>
              {c.is_disabled && <span className="chip bg-ink-100 text-ink-400 dark:bg-ink-800">Disabled</span>}
              <button onClick={() => toggleCountry(c)} className="btn-ghost text-xs">{c.is_disabled ? 'Enable' : 'Disable'}</button>
              <button onClick={() => deleteCountry(c)} className="btn-ghost text-xs text-drag-600"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      ) : tab === 'regions' ? (
        <div className="space-y-2">
          {regions.map((r) => {
            const country = countries.find((c) => c.id === r.country_id);
            return (
              <div key={r.id} className="card flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="font-medium text-ink-900 dark:text-white">{r.name}</p>
                  <p className="text-xs text-ink-400">{country?.flag_emoji} {country?.name}</p>
                </div>
                {r.is_disabled && <span className="chip bg-ink-100 text-ink-400 dark:bg-ink-800">Disabled</span>}
                <button onClick={() => toggleRegion(r)} className="btn-ghost text-xs">{r.is_disabled ? 'Enable' : 'Disable'}</button>
                <button onClick={() => deleteRegion(r)} className="btn-ghost text-xs text-drag-600"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {localAreas.map((la) => {
            const country = countries.find((c) => c.id === la.country_id);
            const region = regions.find((r) => r.id === la.region_id);
            return (
              <div key={la.id} className="card flex items-center gap-3 p-4">
                <div className="flex-1">
                  <p className="font-medium text-ink-900 dark:text-white">{la.name}</p>
                  <p className="text-xs text-ink-400">{country?.flag_emoji} {country?.name}{region ? ` · ${region.name}` : ''}</p>
                </div>
                {la.is_disabled && <span className="chip bg-ink-100 text-ink-400 dark:bg-ink-800">Disabled</span>}
                <button onClick={() => toggleLocal(la)} className="btn-ghost text-xs">{la.is_disabled ? 'Enable' : 'Disable'}</button>
                <button onClick={() => deleteLocal(la)} className="btn-ghost text-xs text-drag-600"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}

      <AddGeoModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        tab={tab}
        countries={countries}
        regions={regions}
        onAdded={() => { setAddOpen(false); load(); }}
      />
    </div>
  );
}

function GeoTab({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Globe; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none', active ? 'bg-white text-ink-900 shadow-soft dark:bg-ink-700 dark:text-white' : 'text-ink-500')}>
      <Icon size={15} /> {children}
    </button>
  );
}

function AddGeoModal({ open, onClose, tab, countries, regions, onAdded }: {
  open: boolean; onClose: () => void; tab: Tab; countries: GeoCountry[]; regions: GeoRegion[]; onAdded: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [isoCode, setIsoCode] = useState('');
  const [flagEmoji, setFlagEmoji] = useState('');
  const [hasRegions, setHasRegions] = useState(false);
  const [countryId, setCountryId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setName(''); setIsoCode(''); setFlagEmoji(''); setHasRegions(false); setCountryId(''); setRegionId(''); }
  }, [open]);

  const selectedCountry = countries.find((c) => c.id === countryId);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    let error: { message: string } | null = null;
    if (tab === 'countries') {
      ({ error } = await supabase.from('geo_countries').insert({
        name: name.trim(), iso_code: isoCode.trim() || null, flag_emoji: flagEmoji.trim() || null,
        has_regions: hasRegions, sort_order: countries.length + 1,
      }));
    } else if (tab === 'regions') {
      if (!countryId) { setSaving(false); return; }
      ({ error } = await supabase.from('geo_regions').insert({
        country_id: countryId, name: name.trim(), sort_order: regions.length + 1,
      }));
    } else {
      if (!countryId) { setSaving(false); return; }
      ({ error } = await supabase.from('geo_local_areas').insert({
        country_id: countryId, region_id: regionId || null, name: name.trim(),
        sort_order: 0,
      }));
    }
    setSaving(false);
    if (error) { toast(error.message, 'error'); return; }
    toast('Added.', 'success');
    onAdded();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Add ${tab === 'countries' ? 'country' : tab === 'regions' ? 'region' : 'local area'}`} size="md">
      <div className="space-y-4">
        {tab !== 'countries' && (
          <div>
            <label className="label">Country</label>
            <select className="input" value={countryId} onChange={(e) => { setCountryId(e.target.value); setRegionId(''); }}>
              <option value="">Select country…</option>
              {countries.filter((c) => !c.is_disabled).map((c) => <option key={c.id} value={c.id}>{c.flag_emoji} {c.name}</option>)}
            </select>
          </div>
        )}
        {tab === 'local' && selectedCountry?.has_regions && (
          <div>
            <label className="label">Region (optional)</label>
            <select className="input" value={regionId} onChange={(e) => setRegionId(e.target.value)}>
              <option value="">None</option>
              {regions.filter((r) => r.country_id === countryId && !r.is_disabled).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}
        {tab === 'countries' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">ISO code</label>
                <input className="input" value={isoCode} onChange={(e) => setIsoCode(e.target.value)} placeholder="GB" maxLength={3} />
              </div>
              <div>
                <label className="label">Flag emoji</label>
                <input className="input" value={flagEmoji} onChange={(e) => setFlagEmoji(e.target.value)} placeholder="🇬🇧" maxLength={4} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
              <input type="checkbox" checked={hasRegions} onChange={(e) => setHasRegions(e.target.checked)} />
              Has administrative regions (states/provinces)
            </label>
          </>
        )}
        <div>
          <label className="label">{tab === 'local' ? 'Local area name' : 'Name'}</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={tab === 'local' ? 'Edinburgh' : tab === 'regions' ? 'Scotland' : 'United Kingdom'} />
        </div>
        <button onClick={add} disabled={saving || !name.trim() || (tab !== 'countries' && !countryId)} className="btn-primary w-full">Add</button>
      </div>
    </Modal>
  );
}
