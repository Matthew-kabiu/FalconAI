// Compact language control for headers: "EN / SW" with the current language at full
// strength. One press switches to the other. Screen readers hear the full names.
// (Two languages only; a third would turn this into a menu.)
import { Languages } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { LANGUAGE_NAMES, LANGUAGES } from '@/lib/i18n';

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();
  const other = LANGUAGES.find((option) => option !== language) ?? language;

  return (
    <button
      type="button"
      onClick={() => setLanguage(other)}
      aria-label={`${t('language.label')}: ${LANGUAGE_NAMES[language]}. ${LANGUAGE_NAMES[other]}`}
      className={[
        'group inline-flex min-h-[2.75rem] cursor-pointer items-center gap-[0.45em] rounded-[0.6rem] px-[0.5em] text-[0.9375rem] tracking-wide text-muted transition-colors hover:text-fg',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        className,
      ].join(' ')}
    >
      <Languages className="size-[1.15em] shrink-0" aria-hidden="true" />
      <span aria-hidden="true" className="inline-flex items-center gap-[0.35em]">
        {LANGUAGES.map((option, index) => (
          <span key={option} className="inline-flex items-center gap-[0.35em]">
            {index > 0 && <span className="opacity-50">/</span>}
            <span className={option === language ? 'font-semibold text-fg' : 'font-medium'}>{option.toUpperCase()}</span>
          </span>
        ))}
      </span>
    </button>
  );
}
