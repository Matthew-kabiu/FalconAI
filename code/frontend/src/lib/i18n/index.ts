// src/lib/i18n/index.ts — language list, lookup and per-device storage (TaskLabs #288).
// Plain typed dictionaries; no i18n library (SOP addendum, Vite contract §12).
import { canRemember } from '@/lib/privacy';
import { en, type MessageKey } from './en';
import { sw } from './sw';

export type { Dictionary, MessageKey } from './en';

export const LANGUAGES = ['en', 'sw'] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * Each language's name written in that language, so a farmer can find their own
 * language whichever one is active. Same in both dictionaries by design.
 */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  sw: 'Kiswahili',
};

const DICTIONARIES = { en, sw } as const;

export type Translate = (key: MessageKey) => string;

export function translate(language: Language, key: MessageKey): string {
  return DICTIONARIES[language][key];
}

/** True for a real dictionary key (e.g. a zod issue message set to a key). */
export function isMessageKey(value: unknown): value is MessageKey {
  return typeof value === 'string' && Object.hasOwn(en, value);
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** Device-level choice. Not a secret and not an auth token, so localStorage is fine. */
const STORAGE_KEY = 'falcon.language';

export function readStoredLanguage(): Language | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    // Storage blocked (private mode, disabled site data): fall back to the browser language.
    return null;
  }
}

export function storeLanguage(language: Language): void {
  // Kept on the device only if the person allows it (cookie notice → preferences).
  if (!canRemember()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage blocked: the choice still applies for this visit, it just isn't remembered.
    if (import.meta.env.DEV) console.warn('[i18n] could not save the language choice');
  }
}

/** Browser's first-choice language: `sw`, `sw-KE`, `sw-TZ` … → Kiswahili; anything else → English. */
export function detectBrowserLanguage(): Language {
  const tag = navigator.languages?.[0] ?? navigator.language ?? '';
  return tag.toLowerCase().startsWith('sw') ? 'sw' : 'en';
}

export function initialLanguage(): Language {
  return readStoredLanguage() ?? detectBrowserLanguage();
}
