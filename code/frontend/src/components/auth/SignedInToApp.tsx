// Wraps the public landing page: a signed-in farmer is sent straight to their Home
// dashboard instead (Matt, 2026-11-19). Signed-out visitors never wait: the landing
// page shows at once, and only once Clerk confirms a session does the redirect run.
import type { ReactNode } from 'react';
import { useAuth } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';

export function SignedInToApp({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) return <Navigate to={ROUTES.pages.app.home} replace />;
  return <>{children}</>;
}
