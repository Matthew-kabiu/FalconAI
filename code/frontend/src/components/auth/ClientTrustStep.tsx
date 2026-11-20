// Sign-in on a new device: Clerk emails a 6-digit code before it lets the session start.
import { useState, type FormEvent } from 'react';
import { useSignIn } from '@clerk/react';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import { codeSchema, fieldErrorsFrom, type FieldErrors } from '@/components/auth/auth-schemas';
import { attempt, describeClerkError } from '@/components/auth/clerk-errors';
import { ResendCodeButton } from '@/components/auth/ResendCodeButton';
import { notify } from '@/components/feedback/toast';
import { Button } from '@/components/ui/Button';
import { CodeField } from '@/components/ui/CodeField';
import { FormError } from '@/components/ui/FormError';
import { useAuthFinish } from '@/hooks/use-auth-finish';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n';

const CODE_ID = 'sign-in-code';

export function ClientTrustStep({ onStartOver }: { onStartOver: () => void }) {
  const { t } = useLanguage();
  const { signIn } = useSignIn();
  const finish = useAuthFinish();

  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'code'>>({});
  const [formError, setFormError] = useState<MessageKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    let error = await attempt(() => signIn.mfa.verifyEmailCode({ code: parsed.data.code }));
    if (error) return fail(error);

    if (signIn.status === 'complete') {
      error = await attempt(() => signIn.finalize({ navigate: finish }));
      if (error) fail(error);
      return;
    }
    // Anything else (for example an authenticator app): AuthPage shows the explanation.
    setSubmitting(false);
  };

  const resend = async () => {
    setFormError(null);
    const error = await attempt(() => signIn.mfa.sendEmailCode());
    if (error) {
      setFormError(describeClerkError(error).key);
      return false;
    }
    notify.success(t('auth.code.resent'));
    return true;
  };

  return (
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
        <Button type="submit" icon={ShieldCheck} loading={submitting} className="min-h-[3rem]! w-full">
          {t('auth.trust.submit')}
        </Button>
      </form>
      <ResendCodeButton onResend={resend} disabled={submitting} />
      <Button variant="ghost" icon={RotateCcw} onClick={onStartOver} disabled={submitting} className="w-full">
        {t('auth.startOver')}
      </Button>
    </div>
  );
}
