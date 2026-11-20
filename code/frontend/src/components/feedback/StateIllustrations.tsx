// Decorative drawings for the "page not found" and "something went wrong" screens.
// Same flat field-notebook style and theme tokens as components/marketing/Illustrations.tsx.

type IllustrationProps = { className?: string };

const line = { strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** A signpost in a field with a trail that wanders off: this path leads nowhere. */
export function LostPathIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 180" aria-hidden="true" focusable="false" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="120" cy="152" rx="96" ry="15" className="fill-leaf-soft" />
      <path d="M36 170 q34 -20 66 -7 t78 -9" className="fill-none stroke-muted" strokeDasharray="2 9" {...line} />
      <rect x="116" y="50" width="8" height="102" rx="3" className="fill-surface stroke-fg" {...line} />
      <path d="M124 60 h50 l13 12 l-13 12 h-50 z" className="fill-leaf-soft stroke-fg" {...line} />
      <path d="M116 94 h-46 l-13 12 l13 12 h46 z" className="fill-surface stroke-fg" {...line} />
      <path d="M138 72 h26 M78 106 h24" className="fill-none stroke-border" {...line} />
      <path d="M190 28 q0 -12 11 -12 q11 0 11 10 q0 7 -8 10 q-3 1 -3 6" className="fill-none stroke-primary" {...line} />
      <circle cx="201" cy="52" r="2.4" className="fill-primary" />
      <path d="M58 152 v-13 M58 144 q-9 -1 -10 -10 q9 0 10 10 M58 141 q9 -1 10 -10 q-9 0 -10 10" className="fill-none stroke-primary" {...line} />
      <path d="M182 152 v-10 M182 146 q-7 -1 -8 -8 q7 0 8 8 M182 144 q7 -1 8 -8 q-7 0 -8 8" className="fill-none stroke-leaf" {...line} />
    </svg>
  );
}

/** A drooping seedling beside a watering can: something wilted, and it can be revived. */
export function WiltedSproutIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg viewBox="0 0 240 180" aria-hidden="true" focusable="false" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="120" cy="154" rx="96" ry="15" className="fill-leaf-soft" />
      <path d="M96 152 q30 -18 60 0 z" className="fill-border stroke-fg" {...line} />
      <path d="M126 143 C126 112 130 94 148 88 C162 84 170 94 168 106" className="fill-none stroke-fg" {...line} />
      <path d="M168 106 q11 7 6 22 q-13 -5 -6 -22 z" className="fill-leaf stroke-fg" {...line} />
      <path d="M128 118 q-18 -3 -25 11 q16 5 25 -11 z" className="fill-leaf-soft stroke-fg" {...line} />
      <rect x="30" y="98" width="42" height="36" rx="7" className="fill-surface stroke-fg" {...line} />
      <path d="M30 106 q-15 7 0 24" className="fill-none stroke-fg" {...line} />
      <path d="M72 108 l24 -14 M91 86 l10 15" className="fill-none stroke-fg" {...line} />
      <path d="M40 110 h22" className="fill-none stroke-border" {...line} />
      <circle cx="106" cy="110" r="2.4" className="fill-primary" />
      <circle cx="112" cy="123" r="2.4" className="fill-primary" />
      <circle cx="102" cy="128" r="2.4" className="fill-primary" />
      <circle cx="196" cy="44" r="17" className="fill-surface stroke-fg" {...line} />
      <path d="M196 34 v12" className="fill-none stroke-primary" {...line} />
      <circle cx="196" cy="53" r="2.2" className="fill-primary" />
    </svg>
  );
}
