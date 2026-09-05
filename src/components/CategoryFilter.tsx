import { cn, categoryAccent } from '@/lib/utils';
import type { Category } from '@/lib/types';

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onChange: (id: string | null) => void;
  scrollable?: boolean;
}

export function CategoryFilter({ categories, selected, onChange, scrollable = true }: CategoryFilterProps) {
  const active = categories.filter((c) => !c.is_disabled);
  if (active.length === 0) return null;

  return (
    <div className={cn(scrollable && 'flex overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0', !scrollable && 'flex flex-wrap', 'gap-2')}>
      <CategoryChip label="All" active={selected === null} onClick={() => onChange(null)} />
      {active.map((c) => {
        const accent = categoryAccent(c.name, c.color);
        const isActive = selected === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onChange(isActive ? null : c.id)}
            className="cat-pill shrink-0 md:shrink-0"
            data-active={isActive}
            style={{ ['--cat-accent' as string]: accent.accent }}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors md:shrink-0',
        active
          ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
          : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700',
      )}
    >
      {label}
    </button>
  );
}
