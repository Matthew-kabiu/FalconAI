// src/hooks/use-language.ts — read the active language and `t()` (TaskLabs #288).
import { useContext } from 'react';
import { LanguageContext, type LanguageContextValue } from '@/context/language-context';

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return value;
}
