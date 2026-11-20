// src/hooks/use-clerk-appearance.ts — Clerk widgets themed with Falcon AI's tokens (DESIGN.md → Authentication).
//
// Clerk's docs recommend direct colour values in `appearance.variables` (not `var(--x)`)
// for the widest browser support, which matters on low-cost Android phones. So the
// values are read from the tokens in index.css at runtime — index.css stays the single
// source of truth — and re-read whenever the light/dark preference changes.
import { useMemo, useSyncExternalStore } from 'react';
import { resolvedScheme, subscribeTheme } from '@/lib/theme';
import type { ClerkProviderProps } from '@clerk/react';

type ClerkAppearance = NonNullable<ClerkProviderProps['appearance']>;
type Scheme = 'light' | 'dark';

// Follows the app's theme choice (Light / Dark / System), not only the OS setting.
const subscribe = subscribeTheme;
const getScheme = (): Scheme => resolvedScheme();

/** One appearance object per scheme, built the first time that scheme is used. */
const cache = new Map<Scheme, ClerkAppearance>();

function appearanceFor(scheme: Scheme): ClerkAppearance {
  const cached = cache.get(scheme);
  if (cached) return cached;

  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => styles.getPropertyValue(name).trim();
  const font = token('--app-font');

  const appearance: ClerkAppearance = {
    variables: {
      colorPrimary: token('--primary'),
      colorPrimaryForeground: token('--on-primary'),
      colorBackground: token('--surface'),
      colorForeground: token('--fg'),
      colorMutedForeground: token('--muted'),
      colorMuted: token('--surface-hover'),
      colorNeutral: token('--fg'),
      colorInput: token('--surface'),
      colorInputForeground: token('--fg'),
      colorBorder: token('--border'),
      colorDanger: token('--danger'),
      colorSuccess: token('--success'),
      colorRing: token('--focus'),
      borderRadius: '0.5rem',
      fontFamily: font,
      fontFamilyButtons: font,
      // DESIGN.md type scale: body 1rem, small text never under 0.875rem.
      fontSize: { xs: '0.875rem', sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.375rem' },
    },
    // Touch targets (DESIGN.md): ≥ 2.75rem; primary action ≥ 3rem tall.
    // Clerk's styles sit outside Tailwind's layers, so these go in as Clerk style objects.
    elements: {
      formButtonPrimary: { minHeight: '3rem', fontSize: '1rem' },
      formFieldInput: { minHeight: '2.75rem', fontSize: '1rem' },
      socialButtonsBlockButton: { minHeight: '2.75rem' },
      footerActionLink: { minHeight: '2.75rem', display: 'inline-flex', alignItems: 'center' },
      userButtonTrigger: { minHeight: '2.75rem', minWidth: '2.75rem' },
      userButtonAvatarBox: { width: '2.25rem', height: '2.25rem' },
    },
  };
  cache.set(scheme, appearance);
  return appearance;
}

/** Appearance for <ClerkProvider>, following the light/dark preference live. */
export function useClerkAppearance(): ClerkAppearance {
  const scheme = useSyncExternalStore(subscribe, getScheme);
  return useMemo(() => appearanceFor(scheme), [scheme]);
}
