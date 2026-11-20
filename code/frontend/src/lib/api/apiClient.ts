// src/lib/api/apiClient.ts — singleton; the ONLY place fetch() is called (Vite-Build-Template §5).
import { ROUTES } from '@/lib/routes';
import { mapErrorToMessage } from '@/lib/api/errorMap';
import type { MessageKey } from '@/lib/i18n';
import type { ApiEnvelope, FieldIssue, HealthStatus, Me } from '@/types/api';
import type {
  Activity,
  ActivityInput,
  CatalogueCrop,
  CropCycle,
  CropCycleDetail,
  CropCycleInput,
  CropCyclePatch,
  FarmCalendar,
  FarmEvent,
  FarmEventInput,
} from '@/types/crop';
import type { Farm, FarmDetail, FarmInput, Page, PageMeta, Plot, PlotInput } from '@/types/farm';

export class ApiClientError extends Error {
  constructor(
    // Friendly message as a dictionary key — the ONLY thing UIs may show, via t().
    // A key rather than text so it follows the active language (TaskLabs #288).
    public userMessage: MessageKey,
    public code: string,
    public statusCode: number,
    /** Field-level problems on a 422 (falcon-core rules), for showing under each field. */
    public issues: FieldIssue[] = [],
  ) {
    super(userMessage);
  }
}

/** Returns the current Clerk session token, or null when signed out. */
export type TokenGetter = () => Promise<string | null>;

class ApiClient {
  private static instance: ApiClient;
  private tokenGetter: TokenGetter | null = null;
  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) ApiClient.instance = new ApiClient();
    return ApiClient.instance;
  }

  /**
   * Registered by <ApiAuthBridge/> (inside ClerkProvider) with Clerk's getToken.
   * The singleton never calls React hooks itself; it only holds the function.
   */
  setTokenGetter(getter: TokenGetter | null): void {
    this.tokenGetter = getter;
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    return (await this.requestEnvelope<T>(url, init)).data;
  }

  /** Like `request`, but keeps `meta` (paged lists). */
  private async requestEnvelope<T>(url: string, init: RequestInit = {}): Promise<{ data: T; meta?: unknown }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      // Clerk refreshes short-lived tokens itself; never stored by us (no localStorage).
      const token = this.tokenGetter ? await this.tokenGetter() : null;
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
      });
      // 204 No Content (e.g. DELETE /events/{id}) is a success with nothing to read.
      if (res.status === 204) return { data: null as T, meta: undefined };
      const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

      if (!res.ok || !body?.success) {
        const failure = body && !body.success ? body : null;
        const code = failure?.error || 'UNKNOWN_ERROR';
        if (import.meta.env.DEV) {
          console.error('[apiClient]', res.status, code, failure ? failure.message : body);
        }
        throw new ApiClientError(mapErrorToMessage(code, res.status), code, res.status, failure?.errors ?? []);
      }
      return { data: body.data, meta: body.meta };
    } catch (err) {
      if (err instanceof ApiClientError) throw err;
      if (import.meta.env.DEV) console.error('[apiClient]', err);
      throw new ApiClientError(mapErrorToMessage('NETWORK_ERROR', 0), 'NETWORK_ERROR', 0);
    } finally {
      clearTimeout(timeout);
    }
  }

  private get = <T>(url: string) => this.request<T>(url);
  private send = <T>(method: 'POST' | 'PATCH' | 'DELETE', url: string, body?: unknown) =>
    this.request<T>(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });

  private async getPage<T, M extends PageMeta = PageMeta>(
    url: string,
    page: number,
    perPage: number,
    filters: Record<string, string> = {},
  ): Promise<Page<T, M>> {
    const query = new URLSearchParams({ ...filters, page: String(page), perPage: String(perPage) });
    const { data, meta } = await this.requestEnvelope<T[]>(`${url}?${query.toString()}`);
    return { items: data, meta: (meta as M | undefined) ?? ({ page, perPage, total: data.length } as M) };
  }

  /** ─── Public surface — mirrors API_ROUTES exactly ─── */
  health = {
    check: () => this.get<HealthStatus>(ROUTES.api.health),
  };

  me = {
    get: () => this.get<Me>(ROUTES.api.me),
  };

  farms = {
    list: (page = 1, perPage = 20) => this.getPage<Farm>(ROUTES.api.farms, page, perPage),
    get: (farmId: string) => this.get<FarmDetail>(ROUTES.api.farm(farmId)),
    create: (input: FarmInput) => this.send<Farm>('POST', ROUTES.api.farms, input),
    update: (farmId: string, input: Partial<FarmInput>) => this.send<Farm>('PATCH', ROUTES.api.farm(farmId), input),
    remove: (farmId: string) => this.send<{ id: string }>('DELETE', ROUTES.api.farm(farmId)),
  };

  crops = {
    catalogue: () => this.get<CatalogueCrop[]>(ROUTES.api.crops),
  };

  cycles = {
    /** All my crop cycles; `open` = planned or active, `closed` = harvested or abandoned. */
    list: (status?: 'open' | 'closed', page = 1, perPage = 20) =>
      this.getPage<CropCycle>(ROUTES.api.cropCycles, page, perPage, status ? { status } : {}),
    forPlot: (plotId: string) => this.get<CropCycle[]>(ROUTES.api.plotCropCycles(plotId)),
    start: (plotId: string, input: CropCycleInput) => this.send<CropCycle>('POST', ROUTES.api.plotCropCycles(plotId), input),
    get: (cycleId: string) => this.get<CropCycleDetail>(ROUTES.api.cropCycle(cycleId)),
    update: (cycleId: string, patch: CropCyclePatch) => this.send<CropCycle>('PATCH', ROUTES.api.cropCycle(cycleId), patch),
  };

  calendar = {
    /** Defaults to 14 days ago through 60 days ahead (Kenya date). */
    get: (from?: string, to?: string) => {
      const query = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) }).toString();
      return this.get<FarmCalendar>(query ? `${ROUTES.api.calendar}?${query}` : ROUTES.api.calendar);
    },
  };

  events = {
    get: (eventId: string) => this.get<FarmEvent>(ROUTES.api.event(eventId)),
    create: (input: FarmEventInput) => this.send<FarmEvent>('POST', ROUTES.api.events, input),
    update: (eventId: string, input: Partial<FarmEventInput>) => this.send<FarmEvent>('PATCH', ROUTES.api.event(eventId), input),
    remove: (eventId: string) => this.send<null>('DELETE', ROUTES.api.event(eventId)),
  };

  activities = {
    list: (cycleId: string, page = 1, perPage = 20) =>
      this.getPage<Activity, PageMeta & { totalCostKes: number }>(ROUTES.api.cycleActivities(cycleId), page, perPage),
    add: (cycleId: string, input: ActivityInput) => this.send<Activity>('POST', ROUTES.api.cycleActivities(cycleId), input),
    update: (activityId: string, input: Partial<ActivityInput>) =>
      this.send<Activity>('PATCH', ROUTES.api.activity(activityId), input),
    remove: (activityId: string) => this.send<{ id: string }>('DELETE', ROUTES.api.activity(activityId)),
  };

  plots = {
    create: (farmId: string, input: PlotInput) => this.send<Plot>('POST', ROUTES.api.farmPlots(farmId), input),
    update: (plotId: string, input: Partial<PlotInput>) => this.send<Plot>('PATCH', ROUTES.api.plot(plotId), input),
    remove: (plotId: string) => this.send<{ id: string }>('DELETE', ROUTES.api.plot(plotId)),
  };
}

export const apiClient = ApiClient.getInstance();
