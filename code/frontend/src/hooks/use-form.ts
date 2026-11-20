// The form behaviour every add/edit screen shares (DESIGN.md → Forms):
// - a field is checked when the person leaves it, then re-checked as they type;
// - a failed save marks every field, focuses the first bad one, shows one warning toast;
// - the API's 422 issues can be put onto the same fields with setErrors.
// Field input ids must be `${idPrefix}-${field}` so focus can find them.
import { useCallback, useEffect, useState } from 'react';
import type { ZodType } from 'zod';
import { notify } from '@/components/feedback/toast';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n';

type Errors<V> = Partial<Record<keyof V, MessageKey>>;

export function useForm<V extends Record<string, string>, Out>(
  initial: V,
  schema: () => ZodType<Out, unknown>,
  order: readonly (keyof V & string)[],
  idPrefix: string,
) {
  const { t } = useLanguage();
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<Errors<V>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof V, boolean>>>({});
  const [focusField, setFocusField] = useState<{ field: string } | null>(null);

  useEffect(() => {
    if (focusField) document.getElementById(`${idPrefix}-${focusField.field}`)?.focus();
  }, [focusField, idPrefix]);

  const allErrors = useCallback(
    (next: V): Errors<V> => {
      const parsed = schema().safeParse(next);
      const found: Errors<V> = {};
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as keyof V;
          found[field] ??= issue.message as MessageKey;
        }
      }
      return found;
    },
    [schema],
  );

  const check = (field: keyof V, next: V) => setErrors((current) => ({ ...current, [field]: allErrors(next)[field] }));

  /** Change one field (re-checks it if the person has already left it once). */
  const set = (field: keyof V, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (touched[field]) check(field, next);
  };

  /** Change a field and check it at once (for pickers: choosing is finishing). */
  /** `also` changes related fields in the same step (e.g. a time unticks "All day"). */
  const pick = (field: keyof V, value: string, also: Partial<V> = {}) => {
    const next = { ...values, ...also, [field]: value };
    setValues(next);
    setTouched((current) => ({ ...current, [field]: true }));
    check(field, next);
  };

  const blur = (field: keyof V) => () => {
    setTouched((current) => ({ ...current, [field]: true }));
    check(field, values);
  };

  /** Runs every check. Returns the clean input, or null after showing what to fix. */
  const validate = (): Out | null => {
    const parsed = schema().safeParse(values);
    if (parsed.success) {
      setErrors({});
      return parsed.data;
    }
    const found = allErrors(values);
    setErrors(found);
    setTouched(Object.fromEntries(order.map((field) => [field, true])) as Partial<Record<keyof V, boolean>>);
    const first = order.find((field) => found[field]);
    if (first) setFocusField({ field: first });
    notify.warning(t('auth.validation.fixFields'));
    return null;
  };

  /** Translated error for a field, or undefined. */
  const error = (field: keyof V) => (errors[field] ? t(errors[field] as MessageKey) : undefined);

  /** True when the field was left with a non-empty valid value (shows a tick). */
  const valid = (field: keyof V) => Boolean(touched[field] && !errors[field] && values[field]?.trim());

  return { values, set, pick, blur, validate, error, valid, setErrors, setValues };
}
