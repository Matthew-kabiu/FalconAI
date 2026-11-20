// "What did you do?" as picture tiles (icon + word), not a list to read: one tap picks.
// Native radio inputs inside labels, so it is one radio group for keyboards and screen
// readers. The chosen tile is tinted with a line under its word, like every choice.
import { useId } from 'react';
import { FieldError } from '@/components/ui/FieldError';
import { useLanguage } from '@/hooks/use-language';
import { ACTIVITY_ICONS, ACTIVITY_LABELS, ACTIVITY_ORDER } from '@/lib/crops';
import type { ActivityKind } from '@/types/crop';

interface ActivityKindPickerProps {
  id: string;
  legend: string;
  value: ActivityKind | '';
  onChange: (kind: ActivityKind) => void;
  error?: string;
}

export function ActivityKindPicker({ id, legend, value, onChange, error }: ActivityKindPickerProps) {
  const { t } = useLanguage();
  const name = useId();
  const errorId = error ? `${id}-error` : undefined;

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={errorId}>
      <legend className="mb-[0.5em] p-0 text-[0.9375rem] font-medium">{legend}</legend>
      <div className="grid grid-cols-2 gap-[0.5rem] sm:grid-cols-4">
        {ACTIVITY_ORDER.map((kind, index) => {
          const Icon = ACTIVITY_ICONS[kind];
          return (
            <label
              key={kind}
              className={[
                'group relative flex min-h-[5rem] cursor-pointer flex-col items-center justify-center gap-[0.35rem] rounded-[0.85rem] bg-bg px-[0.5rem] py-[0.75rem] text-center text-[0.9375rem] transition-colors',
                'font-medium text-muted hover:text-fg has-[:checked]:bg-leaf-soft has-[:checked]:font-semibold has-[:checked]:text-fg',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
              ].join(' ')}
            >
              <input
                id={index === 0 ? id : undefined}
                type="radio"
                name={name}
                value={kind}
                checked={value === kind}
                onChange={() => onChange(kind)}
                className="sr-only"
              />
              <Icon className="size-[1.5rem] shrink-0 group-has-[:checked]:text-primary" aria-hidden="true" />
              <span className="leading-tight">{t(ACTIVITY_LABELS[kind])}</span>
            </label>
          );
        })}
      </div>
      {error && errorId && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  );
}
