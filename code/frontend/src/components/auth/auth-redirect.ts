// Return-path helpers for the sign-in / sign-up screens. The `redirect_url` query
// parameter says where to go after sign-in (Clerk uses the same name, so Clerk and our
// route guards agree). It is re-checked here against open redirects
// (Vite-Build-Template §9): only paths on this app's own origin are accepted.
import type { Location } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';

const REDIRECT_PARAM = 'redirect_url';
const AUTH_PAGES: readonly string[] = Object.values(ROUTES.pages.auth);

/** Where the return path waits while the browser is away at Google. Not a secret. */
const RETURN_KEY = 'falcon.authReturn';

const isAuthPage = (pathname: string) => AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));

/** A safe in-app path from an untrusted value, else Home. */
function safePath(raw: string | null): string {
  if (!raw) return ROUTES.pages.app.home;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin || isAuthPage(url.pathname)) return ROUTES.pages.app.home;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return ROUTES.pages.app.home;
  }
}

/** Sign-in page URL that brings the user back to `location` afterwards. */
export function signInPathFor(location: Location): string {
  const back = new URL(`${location.pathname}${location.search}${location.hash}`, window.location.origin);
  const params = new URLSearchParams({ [REDIRECT_PARAM]: back.href });
  return `${ROUTES.pages.auth.signIn}?${params.toString()}`;
}

/** Where a signed-in user on an auth page should go: a safe in-app return path, else Home. */
export function redirectTarget(search: string): string {
  return safePath(new URLSearchParams(search).get(REDIRECT_PARAM));
}

/** Keep the return path for this tab while the browser leaves for Google and comes back. */
export function rememberReturnPath(search: string): void {
  try {
    window.sessionStorage.setItem(RETURN_KEY, redirectTarget(search));
  } catch {
    // Storage blocked: the user lands on Home after Google instead of the page they came from.
  }
}

/** Read (and forget) the return path saved before going to Google; Home if there is none. */
export function takeReturnPath(): string {
  try {
    const saved = window.sessionStorage.getItem(RETURN_KEY);
    window.sessionStorage.removeItem(RETURN_KEY);
    return safePath(saved);
  } catch {
    return ROUTES.pages.app.home;
  }
}
