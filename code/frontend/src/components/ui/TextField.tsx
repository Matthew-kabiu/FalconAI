// Labelled text input with optional hint and inline error (DESIGN.md → Interaction contract → Forms).
// Visible label (never a placeholder), error under the field, both linked by aria-describedby.
import type { InputHTMLAttributes, ReactNode } from 'react';
import { CircleCheck } from 'lucide-react';
import { FieldError } from '@/components/ui/FieldError';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  id: string;
  /** Already-translated label text. */
  label: string;
  /** Already-translated help text, shown under the field so the label stays next to its input. */
  hint?: string;
  /** Already-translated error; marks the input invalid when set. */
  error?: string;
  /** Control placed inside the right edge of the input (e.g. show/hide password). */
  trailing?: ReactNode;
  /** The value has been checked and is fine: shows a tick (with `validLabel` for screen readers). */
  valid?: boolean;
  validLabel?: string;
  /** Extra content under the field, e.g. password strength. */
  below?: ReactNode;
  className?: string;
}

export function TextField({ id, label, hint, error, trailing, valid = false, validLabel, below, className = '', ...input }: TextFieldProps) {
  const showValid = valid && !error && !trailing;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[0.9375rem] font-medium">
        {label}
      </label>
      <div className="relative mt-[0.4em]">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            // No outline at rest: the field is a filled box a shade apart from what it sits on.
            // A border appears faintly on hover, in the brand colour on focus, in red on error.
            'block min-h-[3rem] w-full rounded-[0.6rem] border bg-bg px-[0.9em] py-[0.6em] text-[1rem] text-fg transition-colors',
            'focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
            error ? 'border-danger' : 'border-transparent hover:border-border',
            trailing || showValid ? 'pr-[3.25rem]' : '',
          ].join(' ')}
          {...input}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center">{trailing}</div>}
        {showValid && (
          <span className="pointer-events-none absolute inset-y-0 right-[0.9rem] flex items-center text-success">
            <CircleCheck className="size-[1.25em]" aria-hidden="true" />
            {validLabel && <span className="sr-only">{validLabel}</span>}
          </span>
        )}
      </div>
      {error && errorId && <FieldError id={errorId}>{error}</FieldError>}
      {below}
      {hint && (
        <p id={hintId} className="mt-[0.4em] text-[0.875rem] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
