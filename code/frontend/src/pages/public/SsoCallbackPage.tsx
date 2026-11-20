// Where Google sends the browser back. Clerk's <HandleSSOCallback/> finishes the
// sign-in (or moves a new Google user into sign-up) and then tells us where to go;
// it also holds Clerk's bot-check mount point. Sits outside <GuestOnly/> so the
// hand-over to a signed-in session is not interrupted.
// Safety net: <HandleSSOCallback/> does nothing at all when it meets a state it has no
// branch for (for example, the Clerk instance asks for a detail Google does not give,
// or this page is opened or reloaded with no Google sign-in under way). So after a
// short wait this page stops spinning and offers the way back.
import { useEffect, useState } from 'react';
import { HandleSSOCallback } from '@clerk/react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { FormError } from '@/components/ui/FormError';
import { useAuthFinish } from '@/hooks/use-auth-finish';
import { useLanguage } from '@/hooks/use-language';
import { ROUTES } from '@/lib/routes';

/** How long a healthy hand-over can reasonably take on a slow connection. */
const STALL_AFTER_MS = 12_000;

export default function SsoCallbackPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const finish = useAuthFinish({ fromSso: true });
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setStalled(true), STALL_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AuthShell title={t(stalled ? 'auth.sso.stalledTitle' : 'auth.sso.title')} lead={stalled ? undefined : t('auth.sso.lead')}>
      {stalled ? (
        <div className="grid gap-[1.25rem]">
          <FormError>{t('auth.sso.stalled')}</FormError>
          <ButtonLink to={ROUTES.pages.auth.signIn} replace icon={ArrowLeft} className="w-full">
            {t('auth.sso.back')}
          </ButtonLink>
        </div>
      ) : (
        <div className="flex justify-start">
          <LoadingState />
        </div>
      )}
      <HandleSSOCallback
        navigateToApp={finish}
        // Clerk needs one more step: the sign-in tab shows it (emailed code, or the explanation).
        navigateToSignIn={() => void navigate(ROUTES.pages.auth.signIn, { replace: true })}
        navigateToSignUp={() => void navigate(ROUTES.pages.auth.signUp, { replace: true })}
      />
    </AuthShell>
  );
}
