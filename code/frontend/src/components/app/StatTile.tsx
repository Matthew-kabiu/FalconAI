import type { LucideIcon } from 'lucide-react';

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  /** Already formatted for display. */
  value: string;
  /** The one figure on the screen that matters most gets the tinted tile. */
  emphasis?: boolean;
}

/** One number with its label. Numbers use tabular figures so columns of tiles line up. */
export function StatTile({ icon: Icon, label, value, emphasis = false }: StatTileProps) {
  return (
    <div className={['rounded-[1rem] p-[clamp(1rem,2.2vw,1.5rem)]', emphasis ? 'bg-leaf-soft' : 'bg-surface'].join(' ')}>
      <dt className="flex items-center gap-[0.5em] text-[0.9375rem] text-muted">
        <Icon className="size-[1.2em] shrink-0 text-primary" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-[0.35rem] text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] font-semibold leading-[1.1] tabular-nums">{value}</dd>
    </div>
  );
}
