// "or / Continue with Google" under a form. Starts Clerk's OAuth redirect; the browser
// comes back to /sso-callback, which finishes the sign-in (SsoCallbackPage).
import { useEffect, useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/react';
import { useLocation } from 'react-router-dom';
import { redirectTarget, rememberReturnPath } from '@/components/auth/auth-redirect';
import type { AuthTab } from '@/components/auth/auth-tabs';
import { attempt, describeClerkError } from '@/components/auth/clerk-errors';
import { GoogleButton } from '@/components/ui/GoogleButton';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';

interface GoogleAuthProps {
  /** Which Clerk flow to start; Clerk moves a new Google user to sign-up (and back) by itself. */
  mode: AuthTab;
  disabled?: boolean;
  /** Friendly message key to show above the form, or null to clear it. */
  onError: (key: MessageKey | null) => void;
}

export function GoogleAuth({ mode, disabled = false, onError }: GoogleAuthProps) {
  const { t } = useLanguage();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { search } = useLocation();
  const [loading, setLoading] = useState(false);

  // Coming back with the browser's Back button can restore this page as it was left:
  // clear the spinner so the button works again.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setLoading(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const start = async () => {
    setLoading(true);
    onError(null);
    rememberReturnPath(search);

    const params = {
      strategy: 'oauth_google' as const,
      redirectUrl: redirectTarget(search),
      redirectCallbackUrl: ROUTES.pages.auth.ssoCallback,
    };
    const error = await attempt(() => (mode === 'signUp' ? signUp.sso(params) : signIn.sso(params)));
    // On success the browser is already on its way to Google; the spinner stays.
    if (error) {
      setLoading(false);
      onError(describeClerkError(error, 'auth.error.google').key);
    }
  };

  return (
    <div>
      <p className="my-[0.9rem] text-center text-[0.875rem] text-muted">{t('auth.or')}</p>
      <GoogleButton label={t('auth.google.continue')} loading={loading} disabled={disabled} onClick={() => void start()} />
    </div>
  );
}
