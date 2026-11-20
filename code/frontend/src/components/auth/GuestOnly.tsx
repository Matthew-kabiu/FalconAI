// Gate for the sign-in / sign-up pages: a signed-in user goes to Home, or to the
// page they were sent here from (Clerk's `redirect_url`).
import { useAuth } from '@clerk/react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { redirectTarget } from '@/components/auth/auth-redirect';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useLanguage } from '@/hooks/use-language';

export function GuestOnly() {
  const { isLoaded, isSignedIn } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (!isLoaded) return <LoadingState label={t('auth.session.checking')} />;
  if (isSignedIn) return <Navigate to={redirectTarget(location.search)} replace />;
  return <Outlet />;
}
