// Backend health check: runs once on mount and again only when the user asks.
// No polling, no intervals.
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import type { MessageKey } from '@/lib/i18n';
import type { HealthStatus } from '@/types/api';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: HealthStatus }
  /** Dictionary key of the friendly message; the page translates it with t(). */
  | { kind: 'error'; message: MessageKey };

const FALLBACK_MESSAGE: MessageKey = 'error.network';

function toErrorState(err: unknown): HealthState {
  return { kind: 'error', message: err instanceof ApiClientError ? err.userMessage : FALLBACK_MESSAGE };
}

export function useHealth() {
  const [state, setState] = useState<HealthState>({ kind: 'loading' });
  const inFlight = useRef(false);

  const load = useCallback(() => {
    inFlight.current = true;
    return apiClient.health
      .check()
      .then((data) => setState({ kind: 'ok', data }))
      .catch((err: unknown) => setState(toErrorState(err)))
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** User-triggered re-check; ignored while a check is already running. */
  const recheck = useCallback(() => {
    if (inFlight.current) return;
    setState({ kind: 'loading' });
    void load();
  }, [load]);

  return { state, recheck };
}
