// The signed-in farmer's farms, one page at a time (20 per page, sorted by name).
// Loads on mount and when the page changes; `reload` after a change. No polling.
import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import type { MessageKey } from '@/lib/i18n';
import type { Farm, Page } from '@/types/farm';

export type FarmsState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: Page<Farm> }
  | { kind: 'error'; message: MessageKey };

export function useFarms(page: number) {
  const [state, setState] = useState<FarmsState>({ kind: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    apiClient.farms
      .list(page)
      .then((data) => live && setState({ kind: 'ok', data }))
      .catch((err: unknown) => {
        if (live) setState({ kind: 'error', message: err instanceof ApiClientError ? err.userMessage : 'error.generic' });
      });
    return () => {
      live = false;
    };
  }, [page, version]);

  // Refresh in place: what is on screen stays there until the new data arrives
  // (DESIGN.md → Loading). After an error there is nothing to keep, so show loading.
  const reload = useCallback(() => {
    setState((current) => (current.kind === 'ok' ? current : { kind: 'loading' }));
    setVersion((value) => value + 1);
  }, []);

  return { state, reload };
}
