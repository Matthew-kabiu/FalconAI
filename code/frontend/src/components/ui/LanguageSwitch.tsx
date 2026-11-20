// Two-option language switch (English / Kiswahili), shown before and after sign-in.
// Changes the UI language for this device; the radio group itself is reusable for
// a future settings-page language field.
import { LanguageRadioGroup } from '@/components/ui/LanguageRadioGroup';
import { useLanguage } from '@/hooks/use-language';

export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return <LanguageRadioGroup value={language} onChange={setLanguage} legend={t('language.label')} className={className} />;
}
