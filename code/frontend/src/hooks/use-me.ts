// The signed-in user as falcon-api sees them (GET /api/v1/me). Loads once on mount
// and again only when the user asks. No polling.
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import type { MessageKey } from '@/lib/i18n';
import type { Me } from '@/types/api';

type MeState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: Me }
  /** Dictionary key of the friendly message; the page translates it with t(). */
  | { kind: 'error'; message: MessageKey };

export function useMe() {
  const [state, setState] = useState<MeState>({ kind: 'loading' });
  const inFlight = useRef(false);

  const load = useCallback(() => {
    inFlight.current = true;
    return apiClient.me
      .get()
      .then((data) => setState({ kind: 'ok', data }))
      .catch((err: unknown) =>
        setState({ kind: 'error', message: err instanceof ApiClientError ? err.userMessage : 'error.generic' }),
      )
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** User-triggered retry; ignored while a request is already running. */
  const retry = useCallback(() => {
    if (inFlight.current) return;
    setState({ kind: 'loading' });
    void load();
  }, [load]);

  return { state, retry };
}
