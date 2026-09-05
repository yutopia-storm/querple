import { cn, initials, avatarColor } from '@/lib/utils';

export function Avatar({
  name,
  id,
  size = 36,
  className,
}: {
  name: string;
  id: string;
  size?: number;
  className?: string;
}) {
  const color = avatarColor(id);
  return (
    <div
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
