// The two tabs of the shared sign-in / create-account screen. Each tab has its own URL.
import type { MessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';

export type AuthTab = 'signIn' | 'signUp';

export const AUTH_TABS: readonly { id: AuthTab; path: string; label: MessageKey }[] = [
  { id: 'signIn', path: ROUTES.pages.auth.signIn, label: 'auth.signIn.title' },
  { id: 'signUp', path: ROUTES.pages.auth.signUp, label: 'auth.signUp.submit' },
];

export const authTabId = (tab: AuthTab) => `auth-tab-${tab}`;
export const authPanelId = (tab: AuthTab) => `auth-panel-${tab}`;

export function authTabFor(pathname: string): AuthTab {
  return pathname === ROUTES.pages.auth.signUp || pathname.startsWith(`${ROUTES.pages.auth.signUp}/`) ? 'signUp' : 'signIn';
}
