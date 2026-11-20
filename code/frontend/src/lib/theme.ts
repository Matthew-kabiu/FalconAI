// Theme choice: System (follow the OS), Light or Dark. Stored per device; applied as
// data-theme on <html> (index.css switches the tokens). index.html applies the saved
// choice before first paint; this module keeps it in sync afterwards.
import { canRemember } from '@/lib/privacy';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export type Scheme = 'light' | 'dark';

/** Not a secret, so localStorage is fine. Must match the inline script in index.html. */
const STORAGE_KEY = 'falcon.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();

const isTheme = (value: unknown): value is Theme => (THEMES as readonly string[]).includes(value as string);

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** What is actually on screen right now. */
export function resolvedScheme(): Scheme {
  const theme = readTheme();
  if (theme !== 'system') return theme;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  try {
    // Kept on the device only if the person allows it (cookie notice → preferences).
    if (theme === 'system' || !canRemember()) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the choice still applies for this visit.
  }
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  listeners.forEach((listener) => listener());
}

/** Fires when the choice changes, or the OS setting changes while on System. */
export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    query.removeEventListener('change', listener);
  };
}
