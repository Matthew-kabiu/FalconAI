// src/context/LanguageProvider.tsx — active UI language (TaskLabs #288).
// Order of precedence: the signed-in farmer's saved preference (applyAccountLanguage,
// wired by the auth card) > this device's choice (localStorage) > browser language.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LanguageContext, type LanguageContextValue } from '@/context/language-context';
import { initialLanguage, isLanguage, storeLanguage, translate, type Language, type MessageKey } from '@/lib/i18n';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  // Screen readers and the browser's hyphenation/spell-check follow <html lang>.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    storeLanguage(next);
  }, []);

  const applyAccountLanguage = useCallback((saved: Language) => {
    // Guard: the value comes from the API at runtime.
    if (!isLanguage(saved)) return;
    setLanguageState(saved);
    storeLanguage(saved); // keep the device in step, so the next visit starts right
  }, []);

  const t = useCallback((key: MessageKey) => translate(language, key), [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, applyAccountLanguage, t }),
    [language, setLanguage, applyAccountLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
