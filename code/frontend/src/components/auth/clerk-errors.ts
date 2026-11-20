// Clerk error → friendly dictionary key (and the field it belongs under, if any).
// Raw Clerk messages never reach the farmer (DESIGN.md → Interaction contract → Feedback).
import { isClerkAPIResponseError } from '@clerk/react/errors';
import type { MessageKey } from '@/lib/i18n';

export type AuthField = 'firstName' | 'lastName' | 'email' | 'password' | 'code';

export interface AuthProblem {
  key: MessageKey;
  /** Set when the message belongs under one field rather than above the form. */
  field?: AuthField;
}

const PROBLEMS: Record<string, AuthProblem> = {
  // Wrong email or password: one message for all of them, so nothing is given away.
  form_password_incorrect: { key: 'auth.error.invalidCredentials' },
  form_identifier_not_found: { key: 'auth.error.invalidCredentials' },
  form_identifier_invalid: { key: 'auth.error.invalidCredentials' },
  strategy_for_user_invalid: { key: 'auth.error.invalidCredentials' },
  form_password_compromised: { key: 'auth.error.passwordCompromised' },

  // Sign-up
  form_identifier_exists: { key: 'auth.error.emailInUse', field: 'email' },
  form_password_pwned: { key: 'auth.error.passwordBreached', field: 'password' },
  form_password_length_too_short: { key: 'auth.error.passwordWeak', field: 'password' },
  form_password_not_strong_enough: { key: 'auth.error.passwordWeak', field: 'password' },
  form_password_validation_failed: { key: 'auth.error.passwordWeak', field: 'password' },
  not_allowed_access: { key: 'auth.error.notAllowed' },
  sign_up_mode_restricted: { key: 'auth.error.notAllowed' },
  sign_up_restricted_waitlist: { key: 'auth.error.notAllowed' },
  captcha_invalid: { key: 'auth.error.captcha' },
  captcha_missing_token: { key: 'auth.error.captcha' },
  captcha_unavailable: { key: 'auth.error.captcha' },

  // Emailed codes
  form_code_incorrect: { key: 'auth.error.codeIncorrect', field: 'code' },
  verification_expired: { key: 'auth.error.codeExpired', field: 'code' },
  verification_failed: { key: 'auth.error.tooManyAttempts' },

  // Limits and locks
  too_many_requests: { key: 'auth.error.tooManyAttempts' },
  user_locked: { key: 'auth.error.locked' },

  // Google
  oauth_access_denied: { key: 'auth.error.google' },
  external_account_not_found: { key: 'auth.error.google' },
  external_account_exists: { key: 'auth.error.google' },

  // No connection
  clerk_offline: { key: 'error.network' },
  network_error: { key: 'error.network' },
};

/** `form_param_format_invalid` names the field it is about. */
const FORMAT_PROBLEMS: Record<string, AuthProblem> = {
  email_address: { key: 'auth.error.emailInvalid', field: 'email' },
  identifier: { key: 'auth.error.emailInvalid', field: 'email' },
  password: { key: 'auth.error.passwordWeak', field: 'password' },
  code: { key: 'auth.error.codeIncorrect', field: 'code' },
};

function readCode(error: unknown): { code?: string; param?: string } {
  if (isClerkAPIResponseError(error)) {
    const first = error.errors[0];
    const param: unknown = first?.meta?.paramName;
    return { code: first?.code, param: typeof param === 'string' ? param : undefined };
  }
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return { code: error.code };
  }
  return {};
}

/** The friendly message for a Clerk error, or `fallback` when the code is not one we know. */
export function describeClerkError(error: unknown, fallback: MessageKey = 'error.generic'): AuthProblem {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { key: 'error.network' };

  const { code, param } = readCode(error);
  if (code === 'form_param_format_invalid' && param && FORMAT_PROBLEMS[param]) return FORMAT_PROBLEMS[param];
  if (code && PROBLEMS[code]) return PROBLEMS[code];

  // Helps the team add a missing code; the farmer still only sees the friendly fallback.
  if (import.meta.env.DEV) console.warn('[auth] unmapped Clerk error code:', code ?? '(none)');
  return { key: fallback };
}

/**
 * Problems worth showing even on the "forgot password" screens, where everything else
 * is kept quiet so the screen never says whether an account exists.
 */
export function isHardStop(key: MessageKey): boolean {
  return key === 'error.network' || key === 'auth.error.tooManyAttempts';
}

/**
 * Run one Clerk step. Clerk's custom-flow methods resolve to `{ error }`; this also
 * catches anything thrown, so a caller only ever checks one value. `null` means it worked.
 */
export async function attempt(run: () => Promise<{ error: unknown }>): Promise<unknown> {
  try {
    return (await run()).error ?? null;
  } catch (thrown) {
    return thrown ?? new Error('auth step failed');
  }
}
