// src/lib/api/errorMap.ts — factory lookup: backend error code → friendly copy.
// Raw backend messages never reach the user (Vite-Build-Template rule 8).
// Returns a dictionary key, not text, so the message shows in the farmer's
// current language even if they switch language after the error (TaskLabs #288).
import type { MessageKey } from '@/lib/i18n';

const CODE_MESSAGES: Record<string, MessageKey> = {
  VALIDATION_ERROR: 'error.validation',
  UNAUTHORIZED: 'error.unauthorized',
  FORBIDDEN: 'error.forbidden',
  NOT_FOUND: 'error.notFound',
  CONFLICT: 'error.conflict',
  FARM_HAS_PLOTS: 'farms.error.hasPlots',
  PLOT_HAS_CROPS: 'plots.error.hasCrops',
  OPEN_CYCLE_EXISTS: 'cycle.error.openExists',
  STATUS_BACKWARDS: 'cycle.error.statusBackwards',
  RATE_LIMIT_EXCEEDED: 'error.rateLimited',
  INTERNAL_ERROR: 'error.internal',
  NETWORK_ERROR: 'error.network',
};

const STATUS_MESSAGES: Record<number, MessageKey> = {
  400: 'error.validation',
  401: 'error.unauthorized',
  403: 'error.forbidden',
  404: 'error.notFound',
  409: 'error.conflict',
  429: 'error.rateLimited',
  503: 'error.unavailable',
};

const FALLBACK: MessageKey = 'error.generic';

export function mapErrorToMessage(code: string, statusCode: number): MessageKey {
  return CODE_MESSAGES[code] ?? STATUS_MESSAGES[statusCode] ?? FALLBACK;
}
