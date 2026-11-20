// Small single choice (e.g. acres / hectares) as line-style radios, the same look as
// ThemeRadioGroup: text labels in a row, the chosen one full-strength with a short bar
// under it. Native radios give radio-group semantics and arrow keys.
import { useId } from 'react';
import { FieldError } from '@/components/ui/FieldError';

interface ChoiceGroupOption {
  value: string;
  label: string;
}

interface ChoiceGroupProps {
  /** Radio group name; generated when not given. */
  name?: string;
  /** Already-translated group name. */
  legend: string;
  /** Show the legend as a visible label, or keep it for screen readers only. */
  showLegend?: boolean;
  options: readonly ChoiceGroupOption[];
  value: string;
  onChange: (value: string) => void;
  /** Already-translated error, shown under the group. */
  error?: string;
}

export function ChoiceGroup({ name, legend, showLegend = true, options, value, onChange, error }: ChoiceGroupProps) {
  const generated = useId();
  const groupName = name ?? generated;
  const errorId = error ? `${generated}-error` : undefined;

  return (
    <fieldset aria-describedby={errorId} className="m-0 min-w-0 border-0 p-0">
      <legend className={showLegend ? 'mb-[0.4em] p-0 text-[0.9375rem] font-medium' : 'sr-only'}>{legend}</legend>
      <div className="flex flex-wrap gap-x-[1.5rem] gap-y-[0.25rem]">
        {options.map((option) => (
          <label
            key={option.value}
            className={[
              'relative inline-flex min-h-[2.75rem] min-w-[2.75rem] cursor-pointer items-center justify-center rounded-[0.4rem] transition-colors',
              'font-medium text-muted hover:text-fg has-[:checked]:font-semibold has-[:checked]:text-fg',
              'after:absolute after:inset-x-0 after:bottom-[0.3rem] after:h-[0.14rem] after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 has-[:checked]:after:scale-x-100',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
            ].join(' ')}
          >
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && errorId && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  );
}
