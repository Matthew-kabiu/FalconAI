// src/components/feedback/toast.ts — the ONLY toast entry point (Vite-Build-Template §6.1)
// All text comes from the dictionary (TaskLabs #288): callers pass `t('…')` for
// success/info/warning, and pass `t` to `error` so the mapped message is translated.
import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api/apiClient';
import type { MessageKey, Translate } from '@/lib/i18n';

export const notify = {
  success: (msg: string) => toast.success(msg),
  info: (msg: string) => toast.info(msg),
  warning: (msg: string) => toast.warning(msg),
  error: (err: unknown, t: Translate, fallback: MessageKey = 'error.generic') => {
    const key = err instanceof ApiClientError ? err.userMessage : fallback;
    toast.error(t(key)); // NEVER the raw backend message
  },
  promise: toast.promise,
};
