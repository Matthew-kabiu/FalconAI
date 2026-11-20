// Step two of creating an account: type the 6-digit code Clerk emailed. On success
// the session starts and the farmer goes Home (or back to the page they came from).
// Opened with no sign-up waiting for a code, it sends the visitor to the sign-up tab.
import { useState, type FormEvent } from 'react';
import { useSignUp } from '@clerk/react';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { codeSchema, fieldErrorsFrom, type FieldErrors } from '@/components/auth/auth-schemas';
import { fill } from '@/components/auth/auth-text';
import { AuthShell } from '@/components/auth/AuthShell';
import { attempt, describeClerkError } from '@/components/auth/clerk-errors';
import { ResendCodeButton } from '@/components/auth/ResendCodeButton';
import { UnsupportedStep } from '@/components/auth/UnsupportedStep';
import { notify } from '@/components/feedback/toast';
import { Button } from '@/components/ui/Button';
import { CodeField } from '@/components/ui/CodeField';
import { FormError } from '@/components/ui/FormError';
import { useAuthFinish } from '@/hooks/use-auth-finish';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';

const CODE_ID = 'verify-email-code';

export default function VerifyEmailPage() {
  const { t } = useLanguage();
  const { signUp } = useSignUp();
  const { search } = useLocation();
  const navigate = useNavigate();
  const finish = useAuthFinish();

  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'code'>>({});
  const [formError, setFormError] = useState<MessageKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** The code was accepted: from here on the "nothing to verify" guard must not fire. */
  const [verified, setVerified] = useState(false);
  const [moreNeeded, setMoreNeeded] = useState(false);

  const signUpPath = { pathname: ROUTES.pages.auth.signUp, search };
  const waitingForCode =
    Boolean(signUp.id) && signUp.status === 'missing_requirements' && signUp.unverifiedFields.includes('email_address');

  if (!waitingForCode && !verified) return <Navigate to={signUpPath} replace />;

  const fail = (error: unknown) => {
    setSubmitting(false);
    const problem = describeClerkError(error);
    if (problem.field === 'code') {
      setErrors({ code: problem.key });
      document.getElementById(CODE_ID)?.focus();
    } else {
      setFormError(problem.key);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const parsed = codeSchema.safeParse({ code });
    if (!parsed.success) {
      setErrors(fieldErrorsFrom<'code'>(parsed.error));
      document.getElementById(CODE_ID)?.focus();
      return;
    }

    setErrors({});
    setFormError(null);
    setSubmitting(true);

    let error = await attempt(() => signUp.verifications.verifyEmailCode({ code: parsed.data.code }));
    if (error) return fail(error);
    setVerified(true);

    if (signUp.status !== 'complete') {
      // Clerk still wants something these screens do not collect (set in the Clerk dashboard).
      setSubmitting(false);
      setMoreNeeded(true);
      return;
    }

    // On success this navigates away; the button keeps its spinner until then.
    error = await attempt(() => signUp.finalize({ navigate: finish }));
    if (error) fail(error);
  };

  const resend = async () => {
    setFormError(null);
    const error = await attempt(() => signUp.verifications.sendEmailCode());
    if (error) {
      setFormError(describeClerkError(error).key);
      return false;
    }
    notify.success(t('auth.code.resent'));
    return true;
  };

  const startOver = async () => {
    await attempt(() => signUp.reset());
    void navigate(signUpPath, { replace: true });
  };

  if (moreNeeded) {
    return (
      <AuthShell title={t('auth.unsupported.title')}>
        <UnsupportedStep body="auth.verify.moreNeeded" onStartOver={() => void startOver()} />
      </AuthShell>
    );
  }

  const lead = signUp.emailAddress ? fill(t('auth.verify.lead'), { email: signUp.emailAddress }) : t('auth.verify.leadNoEmail');

  return (
    <AuthShell title={t('auth.verify.title')} lead={<span className="break-words">{lead}</span>}>
      <div className="flex flex-col gap-[0.5rem]">
        <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-[1.1rem]">
          {formError && <FormError>{t(formError)}</FormError>}
          <CodeField
            id={CODE_ID}
            label={t('auth.field.code')}
            hint={t('auth.field.codeHint')}
            value={code}
            onChange={setCode}
            error={errors.code && t(errors.code)}
          />
          <Button type="submit" icon={MailCheck} loading={submitting} className="min-h-[3rem]! w-full">
            {t('auth.verify.submit')}
          </Button>
        </form>
        <ResendCodeButton onResend={resend} disabled={submitting} />
        <Button variant="ghost" icon={ArrowLeft} onClick={() => void startOver()} disabled={submitting} className="w-full">
          {t('auth.verify.differentEmail')}
        </Button>
      </div>
    </AuthShell>
  );
}
