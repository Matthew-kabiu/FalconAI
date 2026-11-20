// Forgot password, step one: ask for the email and have Clerk send a reset code.
// Whatever Clerk answers (account found or not), the visitor moves on to the same
// "set a new password" screen with the same neutral notice, so this screen never
// says whether an account exists. Only "no connection" and "too many attempts" stop here.
import { useState, type FormEvent } from 'react';
import { useSignIn } from '@clerk/react';
import { Send } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fieldErrorsFrom, forgotPasswordSchema, type FieldErrors } from '@/components/auth/auth-schemas';
import { resetState } from '@/components/auth/auth-state';
import { AuthShell } from '@/components/auth/AuthShell';
import { attempt, describeClerkError, isHardStop } from '@/components/auth/clerk-errors';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { TextField } from '@/components/ui/TextField';
import { TextLink } from '@/components/ui/TextLink';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';

const EMAIL_ID = 'forgot-password-email';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const { signIn } = useSignIn();
  const { search } = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'email'>>({});
  const [formError, setFormError] = useState<MessageKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(fieldErrorsFrom<'email'>(parsed.error));
      document.getElementById(EMAIL_ID)?.focus();
      return;
    }

    setErrors({});
    setFormError(null);
    setSubmitting(true);

    let error = await attempt(() => signIn.create({ identifier: parsed.data.email }));
    if (!error) error = await attempt(() => signIn.resetPasswordEmailCode.sendCode());
    setSubmitting(false);

    if (error) {
      const { key } = describeClerkError(error);
      if (isHardStop(key)) {
        setFormError(key);
        return;
      }
    }
    void navigate({ pathname: ROUTES.pages.auth.resetPassword, search }, { state: resetState(parsed.data.email) });
  };

  return (
    <AuthShell
      title={t('auth.forgot.title')}
      lead={t('auth.forgot.lead')}
      footer={<TextLink to={{ pathname: ROUTES.pages.auth.signIn, search }}>{t('auth.forgot.backToSignIn')}</TextLink>}
    >
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-[1.1rem]">
        {formError && <FormError>{t(formError)}</FormError>}
        <TextField
          id={EMAIL_ID}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
          aria-required="true"
          label={t('auth.field.email')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email && t(errors.email)}
        />
        <Button type="submit" icon={Send} loading={submitting} className="min-h-[3rem]! w-full">
          {t('auth.forgot.submit')}
        </Button>
      </form>
    </AuthShell>
  );
}
