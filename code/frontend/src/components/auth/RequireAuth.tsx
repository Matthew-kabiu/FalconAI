// Gate for signed-in pages (Vite-Build-Template §8.2), driven by Clerk's session.
// UX only: falcon-api verifies the Clerk token on every request (§9 A01).
import { useAuth } from '@clerk/react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { signInPathFor } from '@/components/auth/auth-redirect';
import { LoadingState } from '@/components/feedback/LoadingState';
import { useLanguage } from '@/hooks/use-language';

export function RequireAuth() {
  const { isLoaded, isSignedIn } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  // isSignedIn is only trustworthy once Clerk has loaded.
  if (!isLoaded) return <LoadingState label={t('auth.session.checking')} />;
  if (!isSignedIn) return <Navigate to={signInPathFor(location)} replace />;

  return <Outlet />;
}
