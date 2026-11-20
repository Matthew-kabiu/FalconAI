// Decorative step drawings for the in-app picture tutorials.
// Drawn in the same style and theme tokens as components/marketing/Illustrations.tsx.

type IllustrationProps = { className?: string }

const line = {
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** A blank signboard on two posts beside the farm fence, with a house and crop rows behind. */
export function NameFarmIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground */}
      <ellipse cx="120" cy="134" rx="106" ry="36" className="fill-leaf-soft" />

      {/* Crop rows behind the sign */}
      <path d="M64 106 H106 M62 119 H108 M60 132 H110" className="fill-none stroke-leaf" strokeWidth={5} strokeLinecap="round" strokeDasharray="0.5 9" />

      {/* House */}
      <rect x="164" y="74" width="40" height="34" rx="2" className="fill-surface stroke-fg" {...line} />
      <path d="M158 76 L184 54 L210 76 Z" className="fill-primary stroke-fg" {...line} />
      <rect x="179" y="90" width="10" height="18" rx="1.5" className="fill-muted stroke-fg" strokeWidth={2} strokeLinejoin="round" />

      {/* Fence */}
      <path d="M122 122 H218 M122 134 H218" className="fill-none stroke-fg" {...line} />
      <path d="M146 114 V146 M176 114 V146 M206 114 V146" className="fill-none stroke-fg" strokeWidth={5} strokeLinecap="round" />

      {/* Sign posts */}
      <rect x="47" y="80" width="10" height="72" rx="2" className="fill-border stroke-fg" {...line} />
      <rect x="111" y="80" width="10" height="72" rx="2" className="fill-border stroke-fg" {...line} />

      {/* Blank board with two lines where the name goes */}
      <rect x="28" y="30" width="112" height="56" rx="6" className="fill-surface stroke-fg" {...line} />
      <path d="M46 52 H122 M46 68 H98" className="fill-none stroke-muted" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx="38" cy="40" r="1.5" className="fill-muted" />
      <circle cx="130" cy="40" r="1.5" className="fill-muted" />
    </svg>
  )
}

/** A field from above with one plot being marked out: corner flags, dashed edge and a plus badge. */
export function AddPlotIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Land */}
      <rect x="16" y="18" width="208" height="146" rx="20" className="fill-leaf-soft" />

      {/* Tree */}
      <path d="M36 152 V142" className="fill-none stroke-fg" {...line} />
      <circle cx="36" cy="134" r="10" className="fill-leaf stroke-fg" {...line} />

      {/* The new plot with a dashed boundary */}
      <rect x="56" y="50" width="128" height="88" rx="4" className="fill-surface stroke-primary" strokeWidth={3} strokeLinecap="round" strokeDasharray="8 7" />

      {/* Crop rows */}
      <path d="M80 68 H150 M80 86 H166 M80 104 H166 M80 122 H166" className="fill-none stroke-leaf" strokeWidth={5} strokeLinecap="round" strokeDasharray="0.5 9" />

      {/* Corner pegs with flags */}
      <path d="M56 52 V28 M56 140 V116 M184 140 V116" className="fill-none stroke-fg" {...line} />
      <path d="M56 28 L72 34 L56 40 Z" className="fill-leaf stroke-fg" {...line} />
      <path d="M56 116 L72 122 L56 128 Z" className="fill-leaf stroke-fg" {...line} />
      <path d="M184 116 L200 122 L184 128 Z" className="fill-leaf stroke-fg" {...line} />

      {/* Plus badge on the fourth corner */}
      <circle cx="184" cy="50" r="17" className="fill-surface stroke-fg" {...line} />
      <path d="M184 41 V59 M175 50 H193" className="fill-none stroke-primary" strokeWidth={4.5} strokeLinecap="round" />
    </svg>
  )
}

/** A plot with measuring lines along its width and length, and a tree beside it for scale. */
export function PlotSizeIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Land */}
      <rect x="14" y="16" width="212" height="148" rx="20" className="fill-leaf-soft" />

      {/* Plot */}
      <rect x="66" y="34" width="120" height="86" rx="4" className="fill-surface stroke-fg" {...line} />
      <path d="M78 50 H176 M78 68 H176 M78 86 H176 M78 104 H176" className="fill-none stroke-leaf" strokeWidth={5} strokeLinecap="round" strokeDasharray="0.5 9" />

      {/* Width measure along the bottom */}
      <path d="M66 142 H186" className="fill-none stroke-primary" strokeWidth={3.5} strokeLinecap="round" />
      <path d="M66 133 V151 M186 133 V151" className="fill-none stroke-primary" strokeWidth={3.5} strokeLinecap="round" />
      <path d="M96 142 V136 M126 142 V136 M156 142 V136" className="fill-none stroke-primary" strokeWidth={2} strokeLinecap="round" />

      {/* Length measure along the side */}
      <path d="M44 34 V120" className="fill-none stroke-primary" strokeWidth={3.5} strokeLinecap="round" />
      <path d="M35 34 H53 M35 120 H53" className="fill-none stroke-primary" strokeWidth={3.5} strokeLinecap="round" />
      <path d="M44 56 H50 M44 77 H50 M44 98 H50" className="fill-none stroke-primary" strokeWidth={2} strokeLinecap="round" />

      {/* Tree for scale */}
      <path d="M206 120 V98" className="fill-none stroke-fg" {...line} />
      <circle cx="206" cy="86" r="13" className="fill-leaf stroke-fg" {...line} />
    </svg>
  )
}

/** Two choice cards, maize and beans; the maize card is selected with a check badge. */
export function ChooseCropIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground */}
      <ellipse cx="120" cy="156" rx="104" ry="14" className="fill-leaf-soft" />

      {/* Maize card (selected) */}
      <rect x="22" y="26" width="90" height="124" rx="12" className="fill-surface stroke-primary" strokeWidth={5} strokeLinejoin="round" />
      <path d="M67 122 V138" className="fill-none stroke-primary" strokeWidth={4} strokeLinecap="round" />
      <ellipse cx="67" cy="78" rx="12" ry="28" className="fill-leaf-soft stroke-fg" {...line} />
      <path d="M62 60 h2 M70 60 h2 M60 70 h2 M66 70 h2 M72 70 h2 M60 80 h2 M66 80 h2 M72 80 h2" className="fill-none stroke-muted" strokeWidth={3} strokeLinecap="round" />
      <path d="M67 124 C50 116 46 96 51 78 C60 90 66 106 67 124 Z" className="fill-leaf stroke-fg" {...line} />
      <path d="M67 124 C84 116 88 96 83 78 C74 90 68 106 67 124 Z" className="fill-leaf stroke-fg" {...line} />

      {/* Check badge */}
      <circle cx="106" cy="30" r="14" className="fill-surface stroke-primary" strokeWidth={3.5} />
      <path d="M99 30 L104 35.5 L113 24.5" className="fill-none stroke-primary" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />

      {/* Bean card (plain) */}
      <rect x="128" y="26" width="90" height="124" rx="12" className="fill-surface stroke-fg" {...line} />
      <path d="M161 62 C160 54 165 49 172 47" className="fill-none stroke-primary" {...line} />
      <path d="M172 47 C182 42 193 46 198 56 C188 59 177 55 172 47 Z" className="fill-leaf stroke-fg" {...line} />
      <path d="M156 64 C148 88 158 116 184 124 C189 125 191 120 188 117 C172 107 166 88 168 66 C168 58 158 57 156 64 Z" className="fill-leaf stroke-fg" {...line} />
      <path d="M160 74 Q164 78 163 84 M162 92 Q168 96 168 102 M172 108 Q178 110 180 116" className="fill-none stroke-primary" strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

/** A calendar page with one day marked, next to a seedling going into a soil mound. */
export function PlantingDateIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground */}
      <ellipse cx="120" cy="156" rx="104" ry="14" className="fill-leaf-soft" />

      {/* Calendar page */}
      <rect x="24" y="28" width="112" height="120" rx="8" className="fill-surface stroke-fg" {...line} />
      <path d="M24 54 V36 A8 8 0 0 1 32 28 H128 A8 8 0 0 1 136 36 V54 Z" className="fill-primary stroke-fg" {...line} />
      <path d="M52 20 V36 M108 20 V36" className="fill-none stroke-fg" strokeWidth={4} strokeLinecap="round" />

      {/* Days */}
      <path d="M42 72 H120 M42 90 H120 M42 108 H120 M42 126 H120" className="fill-none stroke-border" strokeWidth={5} strokeLinecap="round" strokeDasharray="2 17" />

      {/* The chosen day */}
      <circle cx="81" cy="108" r="10" className="fill-leaf stroke-fg" {...line} />

      {/* Soil mound */}
      <path d="M150 152 Q186 114 222 152 Z" className="fill-muted stroke-fg" {...line} />

      {/* Seedling */}
      <path d="M186 133 V104" className="fill-none stroke-primary" {...line} />
      <path d="M186 118 C177 116 172 109 173 101 C181 103 186 110 186 118 Z" className="fill-leaf stroke-fg" {...line} />
      <path d="M186 112 C195 110 200 103 199 95 C191 97 186 104 186 112 Z" className="fill-leaf stroke-fg" {...line} />

      {/* Arrow: into the soil */}
      <path d="M186 50 V80 M176 71 L186 82 L196 71" className="fill-none stroke-primary" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** A hand hoe leaning beside a checklist with two ticked rows and one empty row, plus two coins. */
export function RecordWorkIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground */}
      <ellipse cx="120" cy="156" rx="104" ry="14" className="fill-leaf-soft" />

      {/* Hoe (jembe): blade, then handle */}
      <path d="M73 32 L44 31 L30 60 L67 52 Z" className="fill-muted stroke-fg" {...line} />
      <path d="M36.5 151 L44 153 L77.5 30 L70 28 Z" className="fill-border stroke-fg" {...line} />

      {/* Checklist card */}
      <rect x="88" y="26" width="92" height="122" rx="10" className="fill-surface stroke-fg" {...line} />

      {/* Row 1: done */}
      <rect x="100" y="42" width="22" height="22" rx="5" className="fill-leaf-soft stroke-fg" {...line} />
      <path d="M105 53 L110 58 L118 47" className="fill-none stroke-primary" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M132 53 H168" className="fill-none stroke-muted" strokeWidth={3.5} strokeLinecap="round" />

      {/* Row 2: done */}
      <rect x="100" y="76" width="22" height="22" rx="5" className="fill-leaf-soft stroke-fg" {...line} />
      <path d="M105 87 L110 92 L118 81" className="fill-none stroke-primary" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M132 87 H160" className="fill-none stroke-muted" strokeWidth={3.5} strokeLinecap="round" />

      {/* Row 3: still empty */}
      <rect x="100" y="110" width="22" height="22" rx="5" className="fill-surface stroke-fg" {...line} />
      <path d="M132 121 H168" className="fill-none stroke-border" strokeWidth={3.5} strokeLinecap="round" />

      {/* Coins */}
      <circle cx="212" cy="126" r="11" className="fill-surface stroke-fg" {...line} />
      <circle cx="212" cy="126" r="5" className="fill-none stroke-muted" strokeWidth={2} />
      <circle cx="196" cy="145" r="12" className="fill-surface stroke-fg" {...line} />
      <circle cx="196" cy="145" r="5.5" className="fill-none stroke-muted" strokeWidth={2} />
    </svg>
  )
}
