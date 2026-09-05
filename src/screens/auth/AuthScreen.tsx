import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { genYevoxId } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import type { GeoCountry, GeoRegion, GeoLocalArea } from '@/lib/geo';

type Step = 'form' | 'verify' | 'success';

export function AuthScreen({ mode, navigate }: { mode: 'signup' | 'login'; navigate: (to: string) => void }) {
  const toast = useToast();
  const isSignup = mode === 'signup';
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [localArea, setLocalArea] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
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

  const selectedCountry = geoCountries.find((c) => c.name === country);
  const countryRegions = geoRegions.filter((r) => r.country_id === selectedCountry?.id);
  const selectedRegion = countryRegions.find((r) => r.name === region);
  const regionLocalAreas = geoLocalAreas.filter((la) => la.region_id === selectedRegion?.id);
  const countryLocalAreas = geoLocalAreas.filter((la) => la.country_id === selectedCountry?.id && !selectedCountry?.has_regions);
  const availableLocalAreas = selectedCountry?.has_regions ? regionLocalAreas : countryLocalAreas;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || !displayName || !country || !localArea) {
      toast('Please fill in every field.', 'error');
      return;
    }
    if (password.length < 6) {
      toast('Password must be at least 6 characters.', 'error');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, country, city: localArea, region, local_area: localArea, yevox_id: genYevoxId() } },
    });
    if (error) {
      toast(error.message, 'error');
      setLoading(false);
      return;
    }
    if (data.user) {
      const yevoxId = genYevoxId();
      const { error: pe } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        display_name: displayName,
        yevox_id: yevoxId,
        country,
        city: localArea,
        region,
        local_area: localArea,
      });
      if (pe) {
        toast('Account created but profile save failed. Please contact support.', 'error');
        setLoading(false);
        return;
      }
      setStep('verify');
    }
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast('Enter your email and password.', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast(error.message, 'error');
      setLoading(false);
      return;
    }
    toast('Welcome back.', 'success');
    navigate('/');
    setLoading(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast('Enter your email first.', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) toast(error.message, 'error');
    else toast('Password reset link sent to your email.', 'success');
  }

  if (step === 'verify') {
    return (
      <Shell>
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-900/30">
            <Logo size={32} withText={false} />
          </div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Check your email</h1>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
            We sent a verification link to <span className="font-medium text-ink-700 dark:text-ink-200">{email}</span>.
            Click it to activate your account, then sign in.
          </p>
          <button onClick={() => { setStep('form'); setResetMode(false); navigate('/login'); }} className="btn-primary mt-6 w-full">
            Continue to sign in
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="mb-4 flex justify-center"><Logo size={36} /></div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-white">
            {resetMode ? 'Reset password' : isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">
            {resetMode
              ? 'We will email you a secure link.'
              : isSignup
                ? 'Join the public debate — opinions judged, not boosted.'
                : 'Sign in to continue to Yevox.'}
          </p>
        </div>

        {resetMode ? (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending…' : 'Send reset link'}</button>
            <button type="button" onClick={() => setResetMode(false)} className="btn-ghost w-full">Back to sign in</button>
          </form>
        ) : (
          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
            {isSignup && (
              <div>
                <label className="label">Display name</label>
                <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" maxLength={40} />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={isSignup ? 'new-password' : 'current-password'} />
            </div>
            {isSignup && (
              <>
                <div>
                  <label className="label">Country</label>
                  <select className="input" value={country} onChange={(e) => { setCountry(e.target.value); setRegion(''); setLocalArea(''); }}>
                    <option value="">Select country…</option>
                    {geoCountries.map((c) => (
                      <option key={c.id} value={c.name}>{c.flag_emoji} {c.name}</option>
                    ))}
                  </select>
                </div>
                {selectedCountry?.has_regions && (
                  <div>
                    <label className="label">Region / State</label>
                    <select className="input" value={region} onChange={(e) => { setRegion(e.target.value); setLocalArea(''); }} disabled={!country}>
                      <option value="">{country ? 'Select region…' : 'Choose a country first'}</option>
                      {countryRegions.map((r) => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="label">Local area</label>
                  <select className="input" value={localArea} onChange={(e) => setLocalArea(e.target.value)} disabled={!country || (selectedCountry?.has_regions && !region)}>
                    <option value="">{!country ? 'Choose a country first' : selectedCountry?.has_regions && !region ? 'Choose a region first' : 'Select local area…'}</option>
                    {availableLocalAreas.map((la) => (
                      <option key={la.id} value={la.name}>{la.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
            </button>
            {!isSignup && (
              <button type="button" onClick={() => setResetMode(true)} className="btn-ghost w-full text-xs">
                Forgot your password?
              </button>
            )}
          </form>
        )}

        {!resetMode && (
          <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
            {isSignup ? 'Already have an account? ' : 'New to Yevox? '}
            <button
              onClick={() => navigate(isSignup ? '/login' : '/signup')}
              className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </button>
          </p>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 dark:bg-ink-950">
      <div className="w-full">{children}</div>
    </div>
  );
}
