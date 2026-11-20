// zod checks for the auth forms, run before anything is sent to Clerk.
// Each issue message is a dictionary key, so the error shows in the active language.
import { z } from 'zod';
import { isMessageKey, type MessageKey } from '@/lib/i18n';
import { PASSWORD_MIN } from '@/lib/password-strength';


const key = (messageKey: MessageKey) => messageKey;

const email = z.string().trim().pipe(z.email(key('auth.validation.email')));
const newPassword = z.string().min(PASSWORD_MIN, key('auth.validation.passwordShort'));
const code = z.string().regex(/^\d{6}$/, key('auth.validation.code'));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, key('auth.validation.password')),
});

export const signUpSchema = z.object({
  firstName: z.string().trim().min(1, key('auth.validation.firstName')),
  lastName: z.string().trim().min(1, key('auth.validation.lastName')),
  email,
  password: newPassword,
});

export const codeSchema = z.object({ code });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ code, password: newPassword, confirm: z.string() })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    error: key('auth.validation.passwordMismatch'),
  });

/** One friendly message key per field name. */
export type FieldErrors<Field extends string> = Partial<Record<Field, MessageKey>>;

/** First issue per field, as dictionary keys. */
export function fieldErrorsFrom<Field extends string>(error: z.ZodError): FieldErrors<Field> {
  const errors: Partial<Record<string, MessageKey>> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !errors[field]) errors[field] = isMessageKey(issue.message) ? issue.message : 'error.validation';
  }
  return errors as FieldErrors<Field>;
}

/** The message for one field right now (used to check a field when the person leaves it). */
export function fieldErrorFor<Field extends string>(schema: z.ZodType, values: unknown, field: Field): MessageKey | undefined {
  const parsed = schema.safeParse(values);
  return parsed.success ? undefined : fieldErrorsFrom<Field>(parsed.error)[field];
}

/** Move focus to the first field (in screen order) that has an error. */
export function focusFirstError<Field extends string>(order: readonly Field[], errors: FieldErrors<Field>, ids: Record<Field, string>): void {
  const first = order.find((field) => errors[field]);
  if (first) document.getElementById(ids[first])?.focus();
}
