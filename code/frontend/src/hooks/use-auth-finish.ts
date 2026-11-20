// The last step of every sign-in / sign-up: Clerk has made the session, now go to the
// page the user came from (`redirect_url`), else Home. Pass the result to Clerk's
// `finalize({ navigate })` or to <HandleSSOCallback navigateToApp>.
import { useCallback, type ComponentProps } from 'react';
import type { HandleSSOCallback } from '@clerk/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { redirectTarget, takeReturnPath } from '@/components/auth/auth-redirect';
import { AUTH_BLOCKED_STATE } from '@/components/auth/auth-state';
import { ROUTES } from '@/lib/routes';

type FinishNavigate = ComponentProps<typeof HandleSSOCallback>['navigateToApp'];

/** `fromSso`: read the return path saved before the trip to Google instead of the URL. */
export function useAuthFinish({ fromSso = false }: { fromSso?: boolean } = {}): FinishNavigate {
  const navigate = useNavigate();
  const { search } = useLocation();

  return useCallback<FinishNavigate>(
    ({ session, decorateUrl }) => {
      // Clerk wants an extra account task (set by the Clerk dashboard) that these
      // screens cannot do: say so on the sign-in screen instead of looping.
      if (session?.currentTask) {
        void navigate(ROUTES.pages.auth.signIn, { replace: true, state: AUTH_BLOCKED_STATE });
        return;
      }

      const url = decorateUrl(fromSso ? takeReturnPath() : redirectTarget(search));
      // Clerk may hand back a full URL (Safari cookie refresh); that needs a real page load.
      if (url.startsWith('http')) {
        window.location.href = url;
        return;
      }
      void navigate(url, { replace: true });
    },
    [fromSso, navigate, search],
  );
}
