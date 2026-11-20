// Labelled multi-line text box, same look and contract as TextField (DESIGN.md → Forms).
import type { TextareaHTMLAttributes } from 'react';
import { FieldError } from '@/components/ui/FieldError';

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> {
  id: string;
  /** Already-translated label text. */
  label: string;
  /** Already-translated help text, shown under the field. */
  hint?: string;
  /** Already-translated error; marks the box invalid when set. */
  error?: string;
  className?: string;
}

export function TextAreaField({ id, label, hint, error, className = '', rows = 4, ...input }: TextAreaFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[0.9375rem] font-medium">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[
          'mt-[0.4em] block min-h-[6rem] w-full resize-y rounded-[0.6rem] border bg-bg px-[0.9em] py-[0.7em] text-[1rem] leading-relaxed text-fg transition-colors',
          'focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          error ? 'border-danger' : 'border-transparent hover:border-border',
        ].join(' ')}
        {...input}
      />
      {error && errorId && <FieldError id={errorId}>{error}</FieldError>}
      {hint && (
        <p id={hintId} className="mt-[0.4em] text-[0.875rem] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
