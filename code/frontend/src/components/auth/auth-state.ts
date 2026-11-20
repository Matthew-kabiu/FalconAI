// Router `location.state` values passed between the auth screens.

/** Sent to the sign-in screen when Clerk needs a step these screens cannot do. */
export const AUTH_BLOCKED_STATE = { authBlocked: true } as const;

export function isAuthBlocked(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'authBlocked' in state && state.authBlocked === true;
}

/** Sent from "Forgot password" to "Set a new password": the email the code was asked for. */
export function resetState(email: string) {
  return { resetEmail: email };
}

export function readResetEmail(state: unknown): string | null {
  if (typeof state === 'object' && state !== null && 'resetEmail' in state && typeof state.resetEmail === 'string') {
    return state.resetEmail;
  }
  return null;
}
