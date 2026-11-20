// Sign-in tab: email + password, then Google. Clerk's reply decides the next step:
// done (go to the return path), a code for a new device (ClientTrustStep), or a step
// these screens cannot do (UnsupportedStep). AuthPage picks the step from Clerk's state.
import { useState, type FormEvent } from 'react';
import { useSignIn } from '@clerk/react';
import { LogIn } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { fieldErrorFor, fieldErrorsFrom, focusFirstError, signInSchema, type FieldErrors } from '@/components/auth/auth-schemas';
import { attempt, describeClerkError } from '@/components/auth/clerk-errors';
import { GoogleAuth } from '@/components/auth/GoogleAuth';
import { notify } from '@/components/feedback/toast';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { PasswordField } from '@/components/ui/PasswordField';
import { TextField } from '@/components/ui/TextField';
import { TextLink } from '@/components/ui/TextLink';
import { useAuthFinish } from '@/hooks/use-auth-finish';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';

type Field = 'email' | 'password';
const ORDER: readonly Field[] = ['email', 'password'];
const IDS: Record<Field, string> = { email: 'sign-in-email', password: 'sign-in-password' };
/** Statuses AuthPage turns into a next step (emailed code, or the "cannot do this yet" notice). */
const NEXT_STEP_STATUSES: readonly string[] = ['needs_client_trust', 'needs_second_factor'];

export function SignInForm() {
  const { t } = useLanguage();
  const { signIn } = useSignIn();
  const { search } = useLocation();
  const finish = useAuthFinish();

  const [values, setValues] = useState<Record<Field, string>>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<MessageKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check a field when the person leaves it, then keep its message up to date while
  // they fix it. Untouched fields stay quiet until submit.
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const check = (field: Field, next: Record<Field, string>) =>
    setErrors((current) => ({ ...current, [field]: fieldErrorFor<Field>(signInSchema, next, field) }));
  const set = (field: Field) => (event: { target: { value: string } }) => {
    const next = { ...values, [field]: event.target.value };
    setValues(next);
    if (touched[field]) check(field, next);
  };
  const blur = (field: Field) => () => {
    setTouched((current) => ({ ...current, [field]: true }));
    check(field, values);
  };
  const ok = (field: Field) => Boolean(touched[field] && !errors[field] && values[field].trim());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const parsed = signInSchema.safeParse(values);
    if (!parsed.success) {
      const found = fieldErrorsFrom<Field>(parsed.error);
      setErrors(found);
      focusFirstError(ORDER, found, IDS);
      notify.warning(t('auth.validation.fixFields'));
      return;
    }

    setErrors({});
    setFormError(null);
    setSubmitting(true);

    let error = await attempt(() => signIn.password({ emailAddress: parsed.data.email, password: parsed.data.password }));
    if (!error && signIn.status === 'complete') {
      // On success this navigates away; the button keeps its spinner until then.
      error = await attempt(() => signIn.finalize({ navigate: finish }));
      if (!error) return;
    }
    if (!error && signIn.status === 'needs_client_trust') {
      // New device: Clerk wants an emailed code. AuthPage now shows that step.
      error = await attempt(() => signIn.mfa.sendEmailCode());
    }

    setSubmitting(false);
    if (error) setFormError(describeClerkError(error).key);
    // A reply this form has no next step for: say so rather than sit silent.
    else if (!NEXT_STEP_STATUSES.includes(signIn.status)) setFormError('error.generic');
  };

  return (
    <div>
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-[1.1rem]">
        {formError && <FormError>{t(formError)}</FormError>}
        <TextField
          id={IDS.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
          aria-required="true"
          label={t('auth.field.email')}
          value={values.email}
          onChange={set('email')}
          onBlur={blur('email')}
          valid={ok('email')}
          validLabel={t('auth.field.valid')}
          error={errors.email && t(errors.email)}
        />
        <div>
          <PasswordField
            id={IDS.password}
            name="password"
            autoComplete="current-password"
            aria-required="true"
            label={t('auth.field.password')}
            value={values.password}
            onChange={set('password')}
          onBlur={blur('password')}
            error={errors.password && t(errors.password)}
          />
          <div className="flex justify-end">
            <TextLink
              to={{ pathname: ROUTES.pages.auth.forgotPassword, search }}
              className="text-[0.9375rem] text-muted! decoration-transparent hover:text-fg! hover:decoration-current"
            >
              {t('auth.signIn.forgot')}
            </TextLink>
          </div>
        </div>
        <Button type="submit" icon={LogIn} loading={submitting} className="min-h-[3rem]! w-full">
          {t('auth.signIn.title')}
        </Button>
      </form>

      <GoogleAuth mode="signIn" disabled={submitting} onError={setFormError} />
    </div>
  );
}
