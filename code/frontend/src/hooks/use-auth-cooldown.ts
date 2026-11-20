// Countdown for "Send a new code": starts cooling down at once (a code was just sent)
// and can be restarted after each resend.
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_SECONDS = 30;

export function useAuthCooldown(seconds: number = DEFAULT_SECONDS) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  const restart = useCallback(() => setRemaining(seconds), [seconds]);

  return { remaining, restart };
}
