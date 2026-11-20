// Clerk for the whole app (Matt, 2026-11-18): publishable key from the validated env,
// Falcon AI's theme, our sign-in / sign-up pages, and in-app navigation through the
// router (no full page reloads between Clerk's steps on slow phones).
//
// Kiswahili: Clerk ships no Kiswahili localization (checked @clerk/localizations 4.25.0),
// so the Clerk widgets stay in English for now; everything around them is translated.
import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/react';
import { ApiAuthBridge } from '@/components/auth/ApiAuthBridge';
import { useClerkAppearance } from '@/hooks/use-clerk-appearance';
import { env } from '@/lib/config/env';
import { ROUTES } from '@/lib/routes';

interface AppClerkProviderProps {
  /** Router navigation for Clerk (push a new history entry). */
  navigate: (to: string) => unknown;
  /** Router navigation for Clerk (replace the current history entry). */
  replace: (to: string) => unknown;
  children: ReactNode;
}

export function AppClerkProvider({ navigate, replace, children }: AppClerkProviderProps) {
  const appearance = useClerkAppearance();

  return (
    <ClerkProvider
      publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}
      appearance={appearance}
      routerPush={navigate}
      routerReplace={replace}
      signInUrl={ROUTES.pages.auth.signIn}
      signUpUrl={ROUTES.pages.auth.signUp}
      signInFallbackRedirectUrl={ROUTES.pages.app.home}
      signUpFallbackRedirectUrl={ROUTES.pages.app.home}
      afterSignOutUrl={ROUTES.pages.start}
    >
      <ApiAuthBridge />
      {children}
    </ClerkProvider>
  );
}
