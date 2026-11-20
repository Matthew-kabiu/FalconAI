// A quick, local estimate of how hard a password is to guess, to guide the person
// typing it. It is advice, not a gate: Clerk makes the real decision on submit
// (minimum length, and whether the password has appeared in a known data leak).
// Length counts most; a mix of character kinds helps; common words and runs cost.
import type { MessageKey } from '@/lib/i18n';

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  /** 0 too short, 1 weak, 2 fair, 3 good, 4 strong. */
  level: StrengthLevel;
  label: MessageKey;
  /** The single most useful next step. */
  tip: MessageKey;
}

export const PASSWORD_MIN = 8;

const COMMON = ['password', 'qwerty', 'letmein', 'welcome', 'falcon', 'shamba', 'kenya', 'nairobi', 'admin', 'iloveyou', 'abc123'];
const RUNS = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl'];
const LABELS: Record<StrengthLevel, MessageKey> = {
  0: 'auth.strength.tooShort',
  1: 'auth.strength.weak',
  2: 'auth.strength.fair',
  3: 'auth.strength.good',
  4: 'auth.strength.strong',
};

function hasRun(lower: string): boolean {
  return RUNS.some((run) => {
    for (let start = 0; start + 4 <= run.length; start += 1) {
      const piece = run.slice(start, start + 4);
      if (lower.includes(piece) || lower.includes([...piece].reverse().join(''))) return true;
    }
    return false;
  });
}

export function passwordStrength(password: string): PasswordStrength {
  if (password.length < PASSWORD_MIN) return { level: 0, label: LABELS[0], tip: 'auth.strength.tip.length' };

  const lower = password.toLowerCase();
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) => kind.test(password)).length;
  const repeated = new Set(lower).size <= Math.max(2, Math.floor(password.length / 4));
  const common = COMMON.some((word) => lower.includes(word)) || hasRun(lower) || repeated;

  let score = 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (kinds >= 3) score += 1;
  if (kinds === 1 && password.length < 16) score -= 1;
  if (common) score -= 1;
  const level = Math.min(4, Math.max(1, score)) as StrengthLevel;

  let tip: MessageKey = 'auth.strength.tip.ok';
  if (common) tip = 'auth.strength.tip.common';
  else if (level < 3 && password.length < 12) tip = 'auth.strength.tip.length';
  else if (level < 3) tip = 'auth.strength.tip.variety';

  return { level, label: LABELS[level], tip };
}
