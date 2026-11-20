// English / Kiswahili radio group (line style) — used by the header LanguageSwitch
// (and later the settings page). Native radio inputs give radio-group semantics and arrow-key
// movement for free; the inputs are visually hidden and the labels are the visible
// options (custom-styled, never a browser <select>).
import { useId } from 'react';
import { FieldError } from '@/components/ui/FieldError';
import { LANGUAGE_NAMES, LANGUAGES, type Language } from '@/lib/i18n';

interface LanguageRadioGroupProps {
  value: Language;
  onChange: (language: Language) => void;
  /** Already-translated group name. */
  legend: string;
  /** Show the legend as a visible label (forms) or keep it for screen readers only (header). */
  showLegend?: boolean;
  /** Id given to the first radio, so a form can move focus to the group. */
  firstInputId?: string;
  /** Already-translated error; shown under the group. */
  error?: string;
  className?: string;
}

export function LanguageRadioGroup({
  value,
  onChange,
  legend,
  showLegend = false,
  firstInputId,
  error,
  className = '',
}: LanguageRadioGroupProps) {
  const name = useId();
  const errorId = error ? `${name}-error` : undefined;

  return (
    <fieldset className={['m-0 min-w-0 border-0 p-0', className].join(' ')} aria-describedby={errorId}>
      <legend className={showLegend ? 'mb-[0.4em] p-0 text-[0.9375rem] font-medium' : 'sr-only'}>{legend}</legend>
      <div className="flex flex-wrap gap-x-[1.5rem] gap-y-[0.25rem]">
        {LANGUAGES.map((option, index) => (
          <label
            key={option}
            lang={option}
            className={[
              // Line style, like every other choice in the app: the chosen one is
              // full-strength text with a short bar under it. No pill, no box.
              'relative inline-flex min-h-[2.75rem] cursor-pointer items-center rounded-[0.4rem] text-[0.9375rem] transition-colors',
              'font-medium text-muted hover:text-fg has-[:checked]:font-semibold has-[:checked]:text-fg',
              'after:absolute after:inset-x-0 after:bottom-[0.3rem] after:h-[0.14rem] after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 has-[:checked]:after:scale-x-100',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
            ].join(' ')}
          >
            <input
              id={index === 0 ? firstInputId : undefined}
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {LANGUAGE_NAMES[option]}
          </label>
        ))}
      </div>
      {error && errorId && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  );
}
