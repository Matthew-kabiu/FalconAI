// Shared layout classes for the public site, so every section lines up on one grid.
// Width follows the viewport (92% of it), so wide screens are used rather than squeezed.
export const WRAP = 'mx-auto w-[92vw] max-w-[120rem]';
export const SECTION = 'py-[clamp(3rem,9vh,6rem)]';
export const H2 = 'text-[clamp(1.5rem,1.15rem+1.5vw,2.25rem)] font-semibold leading-[1.15] tracking-tight text-balance';
export const H3 = 'text-[1.125rem] font-semibold leading-[1.25]';
export const LEAD = 'text-[1.0625rem] leading-relaxed text-muted';
/** Card shape used across the site: one radius, hairline border, no shadow. */
export const CARD = 'rounded-[1rem] border border-border bg-surface';
export const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
/** Anchor of the Home page's three-step section (linked from the footer). */
export const HOW_IT_WORKS_ID = 'how-it-works';
