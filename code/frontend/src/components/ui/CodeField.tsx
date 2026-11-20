// One input for an emailed or texted one-time code. Numeric keypad on phones, and the
// phone can offer the code from the message (`autoComplete="one-time-code"`).
// Anything that is not a digit is dropped, so a pasted "123 456" still works.
import type { ComponentProps } from 'react';
import { TextField } from '@/components/ui/TextField';

interface CodeFieldProps extends Pick<ComponentProps<typeof TextField>, 'id' | 'label' | 'hint' | 'error' | 'disabled' | 'autoFocus'> {
  value: string;
  onChange: (code: string) => void;
  /** Number of digits in the code. */
  length?: number;
}

export function CodeField({ value, onChange, length = 6, ...field }: CodeFieldProps) {
  return (
    <TextField
      name="code"
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      pattern="[0-9]*"
      aria-required="true"
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, length))}
      {...field}
    />
  );
}
