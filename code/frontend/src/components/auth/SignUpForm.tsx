// Create-account tab: name, email, password, then Google. On submit Clerk creates the
// sign-up and emails a 6-digit code; the next screen is VerifyEmailPage.
import { useState, type FormEvent } from 'react';
import { useSignUp } from '@clerk/react';
import { UserPlus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fieldErrorFor, fieldErrorsFrom, focusFirstError, signUpSchema, type FieldErrors } from '@/components/auth/auth-schemas';
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

type Field = 'firstName' | 'lastName' | 'email' | 'password';
const ORDER: readonly Field[] = ['firstName', 'lastName', 'email', 'password'];
const IDS: Record<Field, string> = {
  firstName: 'sign-up-first-name',
  lastName: 'sign-up-last-name',
  email: 'sign-up-email',
  password: 'sign-up-password',
};

export function SignUpForm() {
  const { t } = useLanguage();
  const { signUp } = useSignUp();
  const { search } = useLocation();
  const navigate = useNavigate();
  const finish = useAuthFinish();

  const [values, setValues] = useState<Record<Field, string>>({ firstName: '', lastName: '', email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<MessageKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check a field when the person leaves it, then keep its message up to date while
  // they fix it. Untouched fields stay quiet until submit.
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const check = (field: Field, next: Record<Field, string>) =>
    setErrors((current) => ({ ...current, [field]: fieldErrorFor<Field>(signUpSchema, next, field) }));
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

  const fail = (error: unknown) => {
    setSubmitting(false);
    const problem = describeClerkError(error);
    if (problem.field && problem.field !== 'code') {
      const found: FieldErrors<Field> = { [problem.field]: problem.key };
      setErrors(found);
      focusFirstError(ORDER, found, IDS);
    } else {
      setFormError(problem.key);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const parsed = signUpSchema.safeParse(values);
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

    const { firstName, lastName, email, password } = parsed.data;
    let error = await attempt(() => signUp.password({ emailAddress: email, password, firstName, lastName }));
    if (error) return fail(error);

    // Email verification switched off in Clerk: the account is ready at once.
    if (signUp.status === 'complete') {
      error = await attempt(() => signUp.finalize({ navigate: finish }));
      if (error) fail(error);
      return;
    }

    error = await attempt(() => signUp.verifications.sendEmailCode());
    if (error) return fail(error);

    setSubmitting(false);
    notify.success(t('auth.notify.codeSent'));
    void navigate({ pathname: ROUTES.pages.auth.verifyEmail, search });
  };

  return (
    <div>
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-[1.1rem]">
        {formError && <FormError>{t(formError)}</FormError>}
        <div className="grid gap-[1.1rem] sm:grid-cols-2">
          <TextField
            id={IDS.firstName}
            name="firstName"
            autoComplete="given-name"
            aria-required="true"
            label={t('auth.field.firstName')}
            value={values.firstName}
            onChange={set('firstName')}
          onBlur={blur('firstName')}
          valid={ok('firstName')}
          validLabel={t('auth.field.valid')}
            error={errors.firstName && t(errors.firstName)}
          />
          <TextField
            id={IDS.lastName}
            name="lastName"
            autoComplete="family-name"
            aria-required="true"
            label={t('auth.field.lastName')}
            value={values.lastName}
            onChange={set('lastName')}
          onBlur={blur('lastName')}
          valid={ok('lastName')}
          validLabel={t('auth.field.valid')}
            error={errors.lastName && t(errors.lastName)}
          />
        </div>
        <TextField
          id={IDS.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
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
        <PasswordField
          id={IDS.password}
          name="password"
          autoComplete="new-password"
          aria-required="true"
          label={t('auth.field.password')}
          hint={t('auth.field.passwordHint')}
          strength
          value={values.password}
          onChange={set('password')}
          onBlur={blur('password')}
          error={errors.password && t(errors.password)}
        />

        {/* Clerk's bot protection draws its check here when it needs one. */}
        <div id="clerk-captcha" />

        <Button type="submit" icon={UserPlus} loading={submitting} className="min-h-[3rem]! w-full">
          {t('auth.signUp.submit')}
        </Button>

        {/* Agreement in words, next to the action it applies to. */}
        <p className="text-[0.875rem] leading-relaxed text-muted">
          {t('legal.signUp.before')}{' '}
          <TextLink to={ROUTES.pages.legal.terms} target="_blank" className="min-h-0!">
            {t('legal.terms.title')}
          </TextLink>{' '}
          {t('legal.signUp.and')}{' '}
          <TextLink to={ROUTES.pages.legal.privacy} target="_blank" className="min-h-0!">
            {t('legal.privacy.title')}
          </TextLink>
          .
        </p>
      </form>

      <GoogleAuth mode="signUp" disabled={submitting} onError={setFormError} />
    </div>
  );
}
