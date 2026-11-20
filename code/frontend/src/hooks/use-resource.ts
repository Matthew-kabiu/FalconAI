// One small loader for every "read something from the API" hook: loading / ok /
// notFound / error, refresh in place (what is on screen stays until new data
// arrives), no polling. Pass a load function whose identity changes only when its
// inputs change (wrap it in useCallback).
import { useCallback, useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api/apiClient';
import type { MessageKey } from '@/lib/i18n';

export type ResourceState<T> =
  | { kind: 'loading' }
  | { kind: 'ok'; data: T }
  | { kind: 'notFound' }
  | { kind: 'error'; message: MessageKey };

export function useResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<ResourceState<T>>({ kind: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    load()
      .then((data) => live && setState({ kind: 'ok', data }))
      .catch((err: unknown) => {
        if (!live) return;
        if (err instanceof ApiClientError && err.statusCode === 404) setState({ kind: 'notFound' });
        else setState({ kind: 'error', message: err instanceof ApiClientError ? err.userMessage : 'error.generic' });
      });
    return () => {
      live = false;
    };
  }, [load, version]);

  const reload = useCallback(() => {
    setState((current) => (current.kind === 'ok' ? current : { kind: 'loading' }));
    setVersion((value) => value + 1);
  }, []);

  return { state, reload };
}
