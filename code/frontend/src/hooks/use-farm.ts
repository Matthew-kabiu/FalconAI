// One farm with all its plots. `notFound` covers a missing farm and someone else's
// farm alike (the API answers 404 for both). Loads on mount; `reload` after a change.
import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import type { MessageKey } from '@/lib/i18n';
import type { FarmDetail } from '@/types/farm';

export type FarmState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: FarmDetail }
  | { kind: 'notFound' }
  | { kind: 'error'; message: MessageKey };

export function useFarm(farmId: string) {
  const [state, setState] = useState<FarmState>({ kind: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    apiClient.farms
      .get(farmId)
      .then((data) => live && setState({ kind: 'ok', data }))
      .catch((err: unknown) => {
        if (!live) return;
        if (err instanceof ApiClientError && err.statusCode === 404) setState({ kind: 'notFound' });
        else setState({ kind: 'error', message: err instanceof ApiClientError ? err.userMessage : 'error.generic' });
      });
    return () => {
      live = false;
    };
  }, [farmId, version]);

  // Refresh in place: what is on screen stays there until the new data arrives
  // (DESIGN.md → Loading). After an error there is nothing to keep, so show loading.
  const reload = useCallback(() => {
    setState((current) => (current.kind === 'ok' ? current : { kind: 'loading' }));
    setVersion((value) => value + 1);
  }, []);

  return { state, reload };
}
