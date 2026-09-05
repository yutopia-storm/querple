import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Send, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { usePlatform } from '@/hooks/usePlatform';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils';
import type { Scope } from '@/lib/types';
import type { GeoCountry, GeoRegion, GeoLocalArea } from '@/lib/geo';

export function CreateStatement({ navigate }: { navigate: (to: string) => void }) {
  const { user, profile } = useAuth();
  const toast = useToast();
  const platform = usePlatform();
  const [body, setBody] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [scope, setScope] = useState<Scope>('global');
  const [scopeCountry, setScopeCountry] = useState('');
  const [scopeRegion, setScopeRegion] = useState('');
  const [scopeCity, setScopeCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [geoCountries, setGeoCountries] = useState<GeoCountry[]>([]);
  const [geoRegions, setGeoRegions] = useState<GeoRegion[]>([]);
  const [geoLocalAreas, setGeoLocalAreas] = useState<GeoLocalArea[]>([]);

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
  const [aiOpen, setAiOpen] = useState(false);
  const [aiCheck, setAiCheck] = useState<{ issues: string[]; similar?: { id: string; body: string }[] } | null>(null);

  if (!user || !profile) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-ink-500">Sign in to create a statement.</p>
        <button onClick={() => navigate('/login')} className="btn-primary mt-4">Sign in</button>
      </div>
    );
  }

  if (!user.emailConfirmed) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <AlertTriangle className="mx-auto mb-2 text-amber-500" size={28} />
        <p className="text-sm text-ink-600 dark:text-ink-300">Verify your email before creating statements.</p>
        <p className="mt-1 text-xs text-ink-400">Check your inbox for the verification link.</p>
      </div>
    );
  }

  const activeCategories = platform.categories.filter((c) => !c.is_disabled);

  function isQuestion(text: string): boolean {
    const t = text.trim().toLowerCase();
    return t.endsWith('?') || /^(should|do|does|did|is|are|can|could|would|will|what|why|how|when|who|which)\b/.test(t) && !t.includes(' should ') === false
      ? /^(should|do|does|did|is|are|can|could|would|will|what|why|how|when|who|which)\b/.test(t)
      : t.endsWith('?');
  }

  async function runAiCheck() {
    setAiOpen(true);
    const issues: string[] = [];
    if (isQuestion(body)) {
      issues.push('This statement appears to be a question. Yevox statements must be written as a declaration. Consider rewriting it as a firm statement.');
    }
    if (body.length > 0 && body.split(/[.!?]/).filter((s) => s.trim().length > 0).length > 2) {
      issues.push('This statement appears to contain multiple separate claims. Consider making it more specific.');
    }
    if (body.length < 20 && body.length > 0) {
      issues.push('This statement is very short. Consider adding more specificity.');
    }
    // similarity check (simple ilike)
    let similar: { id: string; body: string }[] = [];
    if (body.trim().length > 10) {
      const { data } = await supabase
        .from('statements')
        .select('id, body')
        .ilike('body', `%${body.trim().split(' ').slice(0, 3).join('%')}%`)
        .limit(3);
      similar = (data ?? []).filter((s) => s.id !== '').map((s) => ({ id: s.id, body: s.body }));
      if (similar.length > 0) {
        issues.push('A similar statement may already exist. Consider voting on it instead, or continue publishing your own version.');
      }
    }
    setAiCheck({ issues, similar });
  }

  const selectedCountry = geoCountries.find((c) => c.name === scopeCountry);
  const countryRegions = geoRegions.filter((r) => r.country_id === selectedCountry?.id);
  const selectedRegion = countryRegions.find((r) => r.name === scopeRegion);
  const regionLocalAreas = geoLocalAreas.filter((la) => la.region_id === selectedRegion?.id);
  const countryLocalAreas = geoLocalAreas.filter((la) => la.country_id === selectedCountry?.id && !selectedCountry?.has_regions);
  const availableLocalAreas = selectedCountry?.has_regions ? regionLocalAreas : countryLocalAreas;

  async function submit() {
    if (!body.trim() || !reasoning.trim() || !categoryId) {
      toast('Please complete all fields.', 'error');
      return;
    }
    if (scope !== 'global' && !scopeCountry) {
      toast('Select the country for this statement\'s scope.', 'error');
      return;
    }
    if (scope === 'city' && !scopeCity) {
      toast('Select the local area for this statement\'s scope.', 'error');
      return;
    }
    setSubmitting(true);
    const liveUntil = new Date(Date.now() + platform.stallDurationDays * 86400000).toISOString();
    const localArea = scope === 'city' ? scopeCity : null;
    const localAreaRecord = localArea ? geoLocalAreas.find((la) => la.name === localArea && la.country_id === selectedCountry?.id) : null;
    const regionFromArea = localAreaRecord?.region_id ? geoRegions.find((r) => r.id === localAreaRecord.region_id)?.name ?? null : null;
    const region = scope === 'city' ? regionFromArea ?? (scopeRegion || null) : null;
    const { data, error } = await supabase.from('statements').insert({
      author_id: user!.id,
      body: body.trim(),
      reasoning: reasoning.trim(),
      category_id: categoryId,
      scope,
      scope_country: scope === 'global' ? null : scopeCountry,
      scope_city: scope === 'city' ? scopeCity : null,
      scope_region: region,
      scope_local_area: scope === 'city' ? scopeCity : null,
      status: 'live',
      live_until: liveUntil,
    }).select('id').single();
    setSubmitting(false);
    if (error) { toast(error.message, 'error'); return; }
    toast('Statement published. It is now collecting votes.', 'success');
    navigate(`/statement/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => navigate('/')} className="btn-ghost mb-4 -ml-2"><ArrowLeft size={16} /> Back</button>
      <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">Create a statement</h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
        Write it as a declaration, not a question. Your reasoning stays hidden until Turbo.
      </p>

      <div className="card mt-6 space-y-5 p-6">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label mb-0">Statement</label>
            <CharCounter value={body} max={platform.maxStatementLength} />
          </div>
          <textarea
            className="input min-h-[80px] resize-none text-base font-medium"
            placeholder="e.g. Edinburgh doesn't need a tram system."
            value={body}
            maxLength={platform.maxStatementLength}
            onChange={(e) => setBody(e.target.value)}
          />
          {isQuestion(body) && body.length > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle size={13} /> This looks like a question. Rewrite it as a declaration.
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label mb-0">Author's reasoning <span className="font-normal text-ink-400">(hidden until Turbo)</span></label>
            <CharCounter value={reasoning} max={platform.maxReasoningLength} />
          </div>
          <textarea
            className="input min-h-[100px] resize-none"
            placeholder="Explain your reasoning. This stays hidden until your statement earns enough votes to reach Turbo."
            value={reasoning}
            maxLength={platform.maxReasoningLength}
            onChange={(e) => setReasoning(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Category</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select category…</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Scope</label>
            <select className="input" value={scope} onChange={(e) => { setScope(e.target.value as Scope); setScopeCountry(''); setScopeCity(''); }}>
              <option value="global">Global</option>
              <option value="country">Country</option>
              <option value="city">City</option>
            </select>
          </div>
        </div>

        {scope !== 'global' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Country</label>
              <select className="input" value={scopeCountry} onChange={(e) => { setScopeCountry(e.target.value); setScopeRegion(''); setScopeCity(''); }}>
                <option value="">Select country…</option>
                {geoCountries.map((c) => <option key={c.id} value={c.name}>{c.flag_emoji} {c.name}</option>)}
              </select>
            </div>
            {selectedCountry?.has_regions && (
              <div>
                <label className="label">Region / State</label>
                <select className="input" value={scopeRegion} onChange={(e) => { setScopeRegion(e.target.value); setScopeCity(''); }} disabled={!scopeCountry}>
                  <option value="">{scopeCountry ? 'Select region…' : 'Choose country first'}</option>
                  {countryRegions.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
            )}
            {scope === 'city' && (
              <div>
                <label className="label">Local area</label>
                <select className="input" value={scopeCity} onChange={(e) => setScopeCity(e.target.value)} disabled={!scopeCountry || (selectedCountry?.has_regions && !scopeRegion)}>
                  <option value="">{!scopeCountry ? 'Choose country first' : selectedCountry?.has_regions && !scopeRegion ? 'Choose region first' : 'Select local area…'}</option>
                  {availableLocalAreas.map((la) => <option key={la.id} value={la.name}>{la.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-ink-100 pt-4 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={runAiCheck}
            disabled={!body.trim() || platform.flags.ai_assistance === false}
            className="btn-secondary"
          >
            <Sparkles size={16} /> Check before publishing
          </button>
          <button onClick={submit} disabled={submitting} className="btn-primary">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Publish statement
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-ink-400">
        Only users within your chosen scope ({scope === 'global' ? 'everyone' : scope === 'country' ? scopeCountry || 'a country' : scopeCity || 'a local area'}) can vote and comment.
      </p>

      <Modal open={aiOpen} onClose={() => setAiOpen(false)} title="AI clarity check">
        {aiCheck === null ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-ink-400" size={24} /></div>
        ) : aiCheck.issues.length === 0 ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950/40">
              <Check className="text-brand-600" size={24} />
            </div>
            <p className="text-sm font-medium text-ink-700 dark:text-ink-200">No issues found. Your statement reads clearly.</p>
            <button onClick={() => setAiOpen(false)} className="btn-primary mt-4">Continue</button>
          </div>
        ) : (
          <div>
            <div className="space-y-2.5">
              {aiCheck.issues.map((issue, i) => (
                <div key={i} className="flex gap-2.5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
            {aiCheck.similar && aiCheck.similar.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-ink-700 dark:text-ink-200">Similar statements:</p>
                <div className="space-y-2">
                  {aiCheck.similar.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setAiOpen(false); navigate(`/statement/${s.id}`); }}
                      className="block w-full rounded-lg border border-ink-200 p-3 text-left text-sm text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                    >
                      "{s.body}"
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <button onClick={() => setAiOpen(false)} className="btn-secondary flex-1">Edit statement</button>
              <button onClick={() => { setAiOpen(false); submit(); }} className="btn-primary flex-1">Publish anyway</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CharCounter({ value, max }: { value: string; max: number }) {
  const remaining = max - value.length;
  return (
    <span className={cn('text-xs', remaining < 30 ? 'text-drag-500' : 'text-ink-400')}>
      {value.length}/{max}
    </span>
  );
}
