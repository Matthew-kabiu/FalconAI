// What Falcon AI may keep on this device, and whether the cookie notice is showing.
// There is one real choice: remember the language and theme, or not. Sign-in cookies
// are needed for the service to work, and no analytics or advertising is used, so
// neither has a switch. The choice itself is stored (that is needed to honour it).
const STORAGE_KEY = 'falcon.privacy';
/** Device preferences that are cleared when "remember" is turned off. */
const PREFERENCE_KEYS = ['falcon.language', 'falcon.theme'] as const;

export interface PrivacyState {
  /** The person has answered the notice at least once on this device. */
  decided: boolean;
  /** May the language and theme be kept on this device? Defaults to yes. */
  remember: boolean;
  /** The notice was reopened on purpose (from the footer or Account). */
  reopened: boolean;
}

const listeners = new Set<() => void>();

function load(): PrivacyState {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (stored && typeof stored === 'object' && 'remember' in stored) {
      return { decided: true, remember: stored.remember !== false, reopened: false };
    }
  } catch {
    // Storage blocked or unreadable: treat as not yet decided.
  }
  return { decided: false, remember: true, reopened: false };
}

let state: PrivacyState = load();

function update(next: PrivacyState, persist: boolean) {
  state = next;
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ remember: next.remember }));
      if (!next.remember) PREFERENCE_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Storage blocked: the choice still applies for this visit.
    }
  }
  listeners.forEach((listener) => listener());
}

export const getPrivacy = (): PrivacyState => state;

export function subscribePrivacy(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Other modules ask this before writing a preference to the device. */
export const canRemember = (): boolean => state.remember;

/** Turn "remember my language and theme" on or off. Saved at once. */
export const setRemember = (remember: boolean) => update({ ...state, decided: true, remember }, true);

/** "OK": keep the current choice and close the notice. */
export const acceptPrivacy = () => update({ ...state, decided: true, reopened: false }, true);

/** Show the notice again, with its preferences open. */
export const reopenPrivacyNotice = () => update({ ...state, reopened: true }, false);
