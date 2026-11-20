// Labelled Light / Dark / System choice for settings and the footer. Native radios give
// radio-group semantics and arrow keys; the labels are the visible options. The chosen
// one is full-strength text with a short bar under it, like the navigation.
import { useId } from 'react';
import { THEME_OPTIONS } from '@/components/ui/theme-options';
import { useLanguage } from '@/hooks/use-language';
import { useTheme } from '@/hooks/use-theme';
import { THEMES } from '@/lib/theme';

interface ThemeRadioGroupProps {
  /** Show the group name as a visible label, or keep it for screen readers only. */
  showLegend?: boolean;
  className?: string;
}

export function ThemeRadioGroup({ showLegend = false, className = '' }: ThemeRadioGroupProps) {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const name = useId();

  return (
    <fieldset className={['m-0 min-w-0 border-0 p-0', className].join(' ')}>
      <legend className={showLegend ? 'mb-[0.4em] p-0 text-[0.9375rem] font-medium' : 'sr-only'}>{t('theme.label')}</legend>
      <div className="flex flex-wrap gap-x-[1.5rem] gap-y-[0.25rem]">
        {THEMES.map((option) => {
          const { label, Icon } = THEME_OPTIONS[option];
          return (
            <label
              key={option}
              className={[
                'relative inline-flex min-h-[2.75rem] cursor-pointer items-center gap-[0.45em] rounded-[0.4rem] transition-colors',
                'font-medium text-muted hover:text-fg has-[:checked]:font-semibold has-[:checked]:text-fg',
                'after:absolute after:inset-x-0 after:bottom-[0.3rem] after:h-[0.14rem] after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 has-[:checked]:after:scale-x-100',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
              ].join(' ')}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={theme === option}
                onChange={() => setTheme(option)}
                className="sr-only"
              />
              <Icon className="size-[1.15em] shrink-0" aria-hidden="true" />
              {t(label)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
