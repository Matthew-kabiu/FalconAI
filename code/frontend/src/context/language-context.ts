// src/context/language-context.ts — the language context object and its value type.
// Kept apart from LanguageProvider.tsx so that file exports only a component (fast refresh).
import { createContext } from 'react';
import type { Language, Translate } from '@/lib/i18n';

export interface LanguageContextValue {
  language: Language;
  /** The farmer picked a language on this device (language switch). Saved per device. */
  setLanguage: (language: Language) => void;
  /**
   * Apply the signed-in farmer's saved language preference once the account
   * stores one (not wired yet: Clerk sign-in does not carry it today).
   */
  applyAccountLanguage: (language: Language) => void;
  /** Look up a dictionary entry in the active language. */
  t: Translate;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);
