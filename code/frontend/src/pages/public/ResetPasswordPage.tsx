// Forgot password, step two: the emailed code plus a new password. On success the
// farmer is signed in and goes Home. The notice at the top is the same whether or not
// the account exists; a made-up email simply never gets a code that works.
// Opened with no reset under way, it sends the visitor to "Forgot password".
import { useState, type FormEvent } from 'react';
import { useSignIn } from '@clerk/react';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { fieldErrorsFrom, focusFirstError, resetPasswordSchema, type FieldErrors } from '@/components/auth/auth-schemas';
import { readResetEmail } from '@/components/auth/auth-state';
import { fill } from '@/components/auth/auth-text';
import { AuthShell } from '@/components/auth/AuthShell';
import { attempt, describeClerkError, isHardStop, type AuthProblem } from '@/components/auth/clerk-errors';
import { ResendCodeButton } from '@/components/auth/ResendCodeButton';
import { UnsupportedStep } from '@/components/auth/UnsupportedStep';
import { notify } from '@/components/feedback/toast';
import { Button } from '@/components/ui/Button';
import { CodeField } from '@/components/ui/CodeField';
import { FormError } from '@/components/ui/FormError';
import { FormNotice } from '@/components/ui/FormNotice';
import { PasswordField } from '@/components/ui/PasswordField';
import { useAuthFinish } from '@/hooks/use-auth-finish';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';

type Field = 'code' | 'password' | 'confirm';
const ORDER: readonly Field[] = ['code', 'password', 'confirm'];
const IDS: Record<Field, string> = {
  code: 'reset-password-code',
  password: 'reset-password-new',
  confirm: 'reset-password-confirm',
};

/**
 * Checking the code: apart from "expired", "no connection" and "too many attempts",
 * every failure reads as a wrong code, so the screen does not reveal a missing account.
 */
function codeProblem(error: unknown): AuthProblem {
  const problem = describeClerkError(error, 'auth.error.codeIncorrect');
  if (isHardStop(problem.key)) return { key: problem.key };
  if (problem.key === 'auth.error.codeExpired') return problem;
  return { key: 'auth.error.codeIncorrect', field: 'code' };
}

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const { signIn } = useSignIn();
  const location = useLocation();
  const navigate = useNavigate();
  const finish = useAuthFinish();

  const [values, setValues] = useState<Record<Field, string>>({ code: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<MessageKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** The password was changed: from here on the "no reset under way" guard must not fire. */
  const [changed, setChanged] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const { search } = location;
  const forgotPath = { pathname: ROUTES.pages.auth.forgotPassword, search };
  const askedEmail = readResetEmail(location.state);
  const underWay = signIn.status === 'needs_new_password' || signIn.firstFactorVerification?.strategy === 'reset_password_email_code';
  const email = askedEmail ?? (underWay ? signIn.identifier : null);

  if (!askedEmail && !underWay && !changed) return <Navigate to={forgotPath} replace />;

  const set = (field: Field) => (value: string) => setValues((current) => ({ ...current, [field]: value }));

  const fail = (problem: AuthProblem) => {
    setSubmitting(false);
    const field = problem.field === 'code' || problem.field === 'password' ? problem.field : null;
    if (field) {
      const found: FieldErrors<Field> = { [field]: problem.key };
      setErrors(found);
      focusFirstError(ORDER, found, IDS);
    } else {
      setFormError(problem.key);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const parsed = resetPasswordSchema.safeParse(values);
    if (!parsed.success) {
      const found = fieldErrorsFrom<Field>(parsed.error);
      setErrors(found);
      focusFirstError(ORDER, found, IDS);
      return;
    }

    setErrors({});
    setFormError(null);
    setSubmitting(true);

    // If an earlier try already checked the code (and only the password was refused),
    // the code must not be sent again: Clerk accepts it once.
    if (signIn.status !== 'needs_new_password') {
      const error = await attempt(() => signIn.resetPasswordEmailCode.verifyCode({ code: parsed.data.code }));
      if (error) return fail(codeProblem(error));
    }

    let error = await attempt(() => signIn.resetPasswordEmailCode.submitPassword({ password: parsed.data.password }));
    if (error) return fail(describeClerkError(error));
    setChanged(true);

    if (signIn.status !== 'complete') {
      // Password saved, but Clerk wants a second sign-in step these screens cannot do.
      setSubmitting(false);
      setBlocked(true);
      return;
    }

    // On success this navigates away; the button keeps its spinner until then.
    error = await attempt(() => signIn.finalize({ navigate: finish }));
    if (error) return fail(describeClerkError(error));
    notify.success(t('auth.reset.success'));
  };

  const resend = async () => {
    setFormError(null);
    let error = !underWay && email ? await attempt(() => signIn.create({ identifier: email })) : null;
    if (!error) error = await attempt(() => signIn.resetPasswordEmailCode.sendCode());
    if (error) {
      const { key } = describeClerkError(error);
      if (isHardStop(key)) {
        setFormError(key);
        return false;
      }
    }
    notify.success(t('auth.reset.resent'));
    return true;
  };

  const startOver = async () => {
    await attempt(() => signIn.reset());
    void navigate({ pathname: ROUTES.pages.auth.signIn, search }, { replace: true });
  };

  if (blocked) {
    return (
      <AuthShell title={t('auth.unsupported.title')}>
        <UnsupportedStep onStartOver={() => void startOver()} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.reset.title')} lead={t('auth.reset.lead')}>
      <div className="flex flex-col gap-[0.5rem]">
        <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-[1.1rem]">
          <FormNotice>
            <span className="break-words">{email ? fill(t('auth.reset.notice'), { email }) : t('auth.reset.noticeNoEmail')}</span>
          </FormNotice>
          {formError && <FormError>{t(formError)}</FormError>}
          <CodeField
            id={IDS.code}
            label={t('auth.field.code')}
            hint={t('auth.field.codeHint')}
            value={values.code}
            onChange={set('code')}
            error={errors.code && t(errors.code)}
          />
          <PasswordField
            id={IDS.password}
            strength
            name="new-password"
            autoComplete="new-password"
            aria-required="true"
            label={t('auth.field.newPassword')}
            hint={t('auth.field.passwordHint')}
            value={values.password}
            onChange={(event) => set('password')(event.target.value)}
            error={errors.password && t(errors.password)}
          />
          <PasswordField
            id={IDS.confirm}
            name="confirm-password"
            autoComplete="new-password"
            aria-required="true"
            label={t('auth.field.confirmPassword')}
            value={values.confirm}
            onChange={(event) => set('confirm')(event.target.value)}
            error={errors.confirm && t(errors.confirm)}
          />
          <Button type="submit" icon={KeyRound} loading={submitting} className="min-h-[3rem]! w-full">
            {t('auth.reset.submit')}
          </Button>
        </form>
        <ResendCodeButton onResend={resend} disabled={submitting} />
        <Button variant="ghost" icon={ArrowLeft} onClick={() => void navigate(forgotPath)} disabled={submitting} className="w-full">
          {t('auth.verify.differentEmail')}
        </Button>
      </div>
    </AuthShell>
  );
}
