import { cn } from '@/lib/utils';

export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0">
        <rect width="32" height="32" rx="9" className="fill-ink-900 dark:fill-white" />
        <path
          d="M9 21L16 9L23 21"
          className="stroke-brand-500"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="2.4" className="fill-brand-500" />
      </svg>
      {withText && (
        <span className={cn('text-lg font-bold tracking-tight text-ink-900 dark:text-white')}>Yevox</span>
      )}
    </span>
  );
}
