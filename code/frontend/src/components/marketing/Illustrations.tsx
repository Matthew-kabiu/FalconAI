// Decorative landing illustrations drawn for Falcon AI (flat "field notebook" style).
// Colours come only from the theme tokens in src/index.css, so they follow light/dark mode.

type IllustrationProps = { className?: string }

const line = {
  strokeWidth: 2.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** A small farm seen from above: three plots with crop rows, a footpath and a house. */
export function FarmPlotsIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Land */}
      <rect x="14" y="18" width="212" height="148" rx="16" className="fill-leaf-soft stroke-fg" {...line} />

      {/* Footpath to the house */}
      <path d="M122 166 C120 136 122 104 132 90 S168 76 186 72" className="fill-none stroke-border" strokeWidth={9} strokeLinecap="round" />
      <path d="M122 160 C120 136 122 104 132 90 S168 76 184 72" className="fill-none stroke-muted" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="1 8" />

      {/* Plot A: maize rows */}
      <rect x="28" y="32" width="82" height="58" rx="6" className="fill-surface-hover stroke-fg" {...line} />
      <path d="M38 44 H100 M38 56 H100 M38 68 H100 M38 80 H100" className="fill-none stroke-leaf" strokeWidth={5} strokeLinecap="round" strokeDasharray="0.5 9" />

      {/* Plot B: bean rows */}
      <rect x="28" y="102" width="82" height="50" rx="6" className="fill-surface-hover stroke-fg" {...line} />
      <path d="M38 114 H100 M38 127 H100 M38 140 H100" className="fill-none stroke-primary" strokeWidth={4} strokeLinecap="round" strokeDasharray="0.5 7" />

      {/* Plot C: freshly planted, a few rows */}
      <rect x="142" y="94" width="70" height="58" rx="6" className="fill-surface-hover stroke-fg" {...line} />
      <path d="M152 108 H202 M152 123 H202 M152 138 H202" className="fill-none stroke-muted" {...line} strokeDasharray="6 6" />
      <path d="M152 108 H174" className="fill-none stroke-leaf" strokeWidth={5} strokeLinecap="round" strokeDasharray="0.5 10" />

      {/* House */}
      <rect x="172" y="46" width="34" height="26" rx="2" className="fill-surface stroke-fg" {...line} />
      <path d="M166 48 L189 28 L212 48 Z" className="fill-primary stroke-fg" {...line} />
      <rect x="184" y="58" width="10" height="14" rx="1.5" className="fill-muted stroke-fg" strokeWidth={2} strokeLinejoin="round" />

      {/* Tree */}
      <path d="M150 62 V52" className="fill-none stroke-fg" {...line} />
      <circle cx="150" cy="42" r="11" className="fill-leaf stroke-fg" {...line} />
    </svg>
  )
}

/** Four growth stages of maize along a timeline, with a calendar marker over the current one. */
export function CropCalendarIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Soil band and ground line */}
      <rect x="16" y="140" width="208" height="18" rx="6" className="fill-surface-hover" />
      <path d="M16 140 H224" className="fill-none stroke-fg" {...line} />
      <path d="M70 150 h2 M118 152 h2 M176 149 h2 M214 152 h2" className="fill-none stroke-muted" strokeWidth={3} strokeLinecap="round" />

      {/* Stage 1: seed in soil */}
      <path d="M28 140 Q40 132 52 140" className="fill-surface-hover stroke-fg" {...line} />
      <ellipse cx="40" cy="150" rx="6" ry="4" className="fill-muted stroke-fg" strokeWidth={2} />

      {/* Stage 2: sprout */}
      <path d="M92 140 V122" className="fill-none stroke-primary" {...line} />
      <path d="M92 130 C84 128 80 122 81 115 C88 117 92 123 92 130 Z" className="fill-leaf stroke-fg" {...line} />
      <path d="M92 125 C100 123 104 117 103 110 C96 112 92 118 92 125 Z" className="fill-leaf stroke-fg" {...line} />

      {/* Stage 3: young maize (current) */}
      <path d="M148 140 V90" className="fill-none stroke-primary" {...line} />
      <path d="M148 130 C136 126 128 116 123 104 C134 108 144 116 148 124 Z" className="fill-leaf stroke-fg" {...line} />
      <path d="M148 118 C160 114 168 104 173 92 C162 96 152 104 148 112 Z" className="fill-leaf stroke-fg" {...line} />
      <path d="M148 102 C144 94 144 86 148 78 C152 86 152 94 148 102 Z" className="fill-leaf stroke-fg" {...line} />

      {/* Stage 4: mature maize with cob and tassel */}
      <path d="M200 140 V56" className="fill-none stroke-primary" {...line} />
      <path d="M200 132 C186 128 176 118 170 104 C184 108 196 118 200 126 Z" className="fill-leaf stroke-fg" {...line} />
      <path d="M200 112 C186 106 178 94 175 80 C188 86 196 96 200 104 Z" className="fill-leaf stroke-fg" {...line} />
      <path d="M200 88 C210 82 218 72 220 60 C210 66 203 74 200 80 Z" className="fill-leaf stroke-fg" {...line} />
      <ellipse cx="211" cy="110" rx="6" ry="14" transform="rotate(18 211 110)" className="fill-surface stroke-fg" {...line} />
      <path d="M206 103 l3 1 M207 110 l3 1 M208 117 l3 1" className="fill-none stroke-muted" strokeWidth={2} strokeLinecap="round" />
      <path d="M201 124 C205 116 205 106 208 98 C214 106 214 118 206 126" className="fill-leaf stroke-fg" {...line} />
      <path d="M200 56 L193 44 M200 56 L200 41 M200 56 L207 44" className="fill-none stroke-muted" {...line} />

      {/* Calendar card over the current stage */}
      <path
        d="M134 22 H162 A6 6 0 0 1 168 28 V56 A6 6 0 0 1 162 62 H154 L148 69 L142 62 H134 A6 6 0 0 1 128 56 V28 A6 6 0 0 1 134 22 Z"
        className="fill-surface stroke-fg"
        {...line}
      />
      <path d="M128 35 V28 A6 6 0 0 1 134 22 H162 A6 6 0 0 1 168 28 V35 Z" className="fill-primary stroke-fg" {...line} />
      <path d="M138 18 V26 M158 18 V26" className="fill-none stroke-fg" {...line} />
      <path d="M136 44 h2 M146 44 h2 M156 44 h2 M136 53 h2 M146 53 h2" className="fill-none stroke-border" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx="157" cy="53" r="4" className="fill-leaf" />

      {/* Progress timeline */}
      <path d="M40 170 H200" className="fill-none stroke-border" {...line} />
      <circle cx="40" cy="170" r="4" className="fill-primary" />
      <circle cx="92" cy="170" r="4" className="fill-primary" />
      <circle cx="148" cy="170" r="5.5" className="fill-leaf stroke-fg" strokeWidth={2} />
      <circle cx="200" cy="170" r="4" className="fill-surface stroke-border" strokeWidth={2} />
    </svg>
  )
}

/** An open record book with ruled lines and cost bars, a seed/fertiliser bag and coins. */
export function CostLogIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Notebook cover */}
      <path d="M18 50 V150 Q52 142 86 154 Q120 142 154 150 V50" className="fill-primary stroke-fg" {...line} />

      {/* Pages */}
      <path d="M24 44 Q56 36 86 48 V146 Q56 136 24 142 Z" className="fill-surface stroke-fg" {...line} />
      <path d="M86 48 Q116 36 148 44 V142 Q116 136 86 146 Z" className="fill-surface stroke-fg" {...line} />

      {/* Left page: ruled lines with short entries */}
      <path d="M32 66 Q55 62 78 70 M32 84 Q55 80 78 88 M32 102 Q55 98 78 106 M32 120 Q55 116 78 124" className="fill-none stroke-border" strokeWidth={2} strokeLinecap="round" />
      <path d="M34 60 H52 M34 78 H58 M34 96 H48 M34 114 H54" className="fill-none stroke-muted" {...line} />

      {/* Right page: cost bars */}
      <path d="M96 128 Q118 122 140 126" className="fill-none stroke-border" strokeWidth={2} strokeLinecap="round" />
      <rect x="98" y="96" width="9" height="28" rx="2" className="fill-leaf stroke-fg" strokeWidth={2} />
      <rect x="112" y="80" width="9" height="43" rx="2" className="fill-primary stroke-fg" strokeWidth={2} />
      <rect x="126" y="102" width="9" height="21" rx="2" className="fill-leaf stroke-fg" strokeWidth={2} />
      <path d="M96 60 H118 M96 70 H130" className="fill-none stroke-muted" {...line} />

      {/* Seed / fertiliser bag */}
      <path d="M168 84 L164 146 Q164 152 170 152 H210 Q216 152 216 146 L212 84 Z" className="fill-surface-hover stroke-fg" {...line} />
      <path d="M168 84 Q170 72 177 76 Q183 67 190 74 Q197 66 203 74 Q210 70 212 84" className="fill-surface-hover stroke-fg" {...line} />
      <path d="M169 92 Q190 98 211 92" className="fill-none stroke-fg" {...line} />
      <rect x="176" y="108" width="28" height="26" rx="4" className="fill-surface stroke-fg" {...line} />
      <path d="M190 128 C182 124 182 116 190 112 C198 116 198 124 190 128 Z" className="fill-leaf stroke-fg" strokeWidth={2} strokeLinejoin="round" />

      {/* Spilled seeds */}
      <ellipse cx="222" cy="156" rx="3" ry="2" className="fill-muted" />
      <ellipse cx="228" cy="150" rx="3" ry="2" className="fill-muted" />

      {/* Coins */}
      <ellipse cx="166" cy="164" rx="12" ry="5" className="fill-surface stroke-fg" {...line} />
      <path d="M154 164 V158 M178 164 V158" className="fill-none stroke-fg" {...line} />
      <ellipse cx="166" cy="158" rx="12" ry="5" className="fill-surface stroke-fg" {...line} />
      <circle cx="192" cy="160" r="9" className="fill-surface stroke-fg" {...line} />
      <circle cx="192" cy="160" r="4" className="fill-none stroke-muted" strokeWidth={2} />
    </svg>
  )
}

/** A phone camera framing a spotted leaf inside a soft viewfinder. */
export function CropHealthIllustration({ className = '' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 200"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background leaf behind the phone */}
      <path d="M46 150 C30 128 32 98 54 80 C66 104 64 132 46 150 Z" className="fill-leaf-soft stroke-border" {...line} />
      <path d="M194 60 C214 70 222 96 210 118 C192 104 186 80 194 60 Z" className="fill-leaf-soft stroke-border" {...line} />

      {/* Phone body */}
      <rect x="70" y="14" width="100" height="174" rx="16" className="fill-surface stroke-fg" {...line} />
      <rect x="108" y="22" width="24" height="4" rx="2" className="fill-border" />

      {/* Screen */}
      <rect x="78" y="34" width="84" height="124" rx="8" className="fill-leaf-soft stroke-border" strokeWidth={2} />

      {/* Leaf on screen */}
      <path d="M120 58 C144 70 150 104 128 132 C124 137 116 137 112 132 C90 104 96 70 120 58 Z" className="fill-leaf stroke-fg" {...line} />
      <path d="M120 64 Q122 100 120 146" className="fill-none stroke-primary" {...line} />
      <path d="M121 86 L134 78 M121 104 L137 96 M121 120 L132 114 M120 94 L106 86 M120 112 L104 104" className="fill-none stroke-primary" strokeWidth={2} strokeLinecap="round" />

      {/* Spots */}
      <circle cx="110" cy="96" r="4.5" className="fill-muted" />
      <circle cx="131" cy="90" r="3.5" className="fill-muted" />
      <circle cx="128" cy="112" r="5" className="fill-muted" />
      <circle cx="112" cy="118" r="3" className="fill-muted" />

      {/* Viewfinder corners */}
      <path
        d="M88 62 V56 A8 8 0 0 1 96 48 H102 M138 48 H144 A8 8 0 0 1 152 56 V62 M152 134 V140 A8 8 0 0 1 144 148 H138 M102 148 H96 A8 8 0 0 1 88 140 V134"
        className="fill-none stroke-primary"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Shutter button */}
      <circle cx="120" cy="173" r="8" className="fill-surface stroke-fg" {...line} />
      <circle cx="120" cy="173" r="4" className="fill-primary" />
    </svg>
  )
}
