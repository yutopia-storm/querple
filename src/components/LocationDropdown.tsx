import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useLocation } from '@/context/LocationContext';
import { cn } from '@/lib/utils';
import { ALL_LOCATIONS } from '@/lib/geo';
import type { LocationSelection } from '@/lib/geo';

export function LocationDropdown({ variant = 'standalone' }: { variant?: 'standalone' | 'nav' }) {
  const { selection, setLocation, options, loading } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const currentLabel = selection.level === 'global' && !selection.country
    ? 'Global'
    : options.find(
        (o) =>
          o.selection.level === selection.level &&
          o.selection.country === selection.country &&
          o.selection.region === selection.region &&
          o.selection.localArea === selection.localArea,
      )?.label ?? 'Global';

  function select(s: LocationSelection) {
    setLocation(s);
    setOpen(false);
  }

  const isGlobal = selection.level === 'global' && !selection.country;

  if (variant === 'nav') {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'flex items-center gap-1 text-sm font-medium transition-colors',
            open
              ? 'text-ink-900 dark:text-white'
              : 'text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white',
          )}
        >
          {currentLabel}
          <ChevronDown size={15} className={cn('text-ink-400 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[200px] animate-scale-in rounded-xl border border-ink-200 bg-white p-1.5 shadow-float dark:border-ink-800 dark:bg-ink-900">
            {loading ? (
              <div className="px-3 py-4 text-center text-sm text-ink-400">Loading locations…</div>
            ) : (
              options.map((o, i) => {
                const active =
                  o.selection.level === selection.level &&
                  o.selection.country === selection.country &&
                  o.selection.region === selection.region &&
                  o.selection.localArea === selection.localArea;
                const isAllOpt = o.selection.level === 'global' && !o.selection.country;
                return (
                  <button
                    key={`${o.level}-${o.label}-${i}`}
                    onClick={() => select(isAllOpt ? ALL_LOCATIONS : o.selection)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      active
                        ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950/30 dark:text-brand-300'
                        : 'text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800',
                    )}
                  >
                    <span className="flex-1">{o.label}</span>
                    {active && <Check size={15} className="text-brand-600 dark:text-brand-400" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all',
          open
            ? 'border-brand-500 ring-2 ring-brand-500/20'
            : 'border-ink-200 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-600',
          isGlobal ? 'text-ink-600 dark:text-ink-300' : 'text-ink-900 dark:text-white',
        )}
      >
        <span className="flex-1 text-left">{currentLabel}</span>
        <ChevronDown size={15} className={cn('text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[200px] animate-scale-in rounded-xl border border-ink-200 bg-white p-1.5 shadow-float dark:border-ink-800 dark:bg-ink-900">
          {loading ? (
            <div className="px-3 py-4 text-center text-sm text-ink-400">Loading locations…</div>
          ) : (
            options.map((o, i) => {
              const active =
                o.selection.level === selection.level &&
                o.selection.country === selection.country &&
                o.selection.region === selection.region &&
                o.selection.localArea === selection.localArea;
              const isAllOpt = o.selection.level === 'global' && !o.selection.country;
              return (
                <button
                  key={`${o.level}-${o.label}-${i}`}
                  onClick={() => select(isAllOpt ? ALL_LOCATIONS : o.selection)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950/30 dark:text-brand-300'
                      : 'text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800',
                  )}
                >
                  <span className="flex-1">{o.label}</span>
                  {active && <Check size={15} className="text-brand-600 dark:text-brand-400" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
