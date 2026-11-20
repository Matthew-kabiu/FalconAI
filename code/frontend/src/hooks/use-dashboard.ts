// Data for the Home dashboard, with the same loading / ok / error shape as the other
// data hooks. All real: farms and plots (GET /api/v1/farms), growing crops
// (/crop-cycles?status=open), and "next up" / "recent" from the one farm calendar
// (/calendar).
// In development a reviewer can switch on sample data to judge the filled design.
import { useEffect, useMemo, useState } from 'react';
import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import type { MessageKey } from '@/lib/i18n';
import { comingUp, done } from '@/lib/farm-calendar';
import { EMPTY_DASHBOARD, sampleDashboard } from '@/lib/sample/dashboard';
import type { ActivityKind } from '@/types/crop';
import type { Dashboard } from '@/types/dashboard';

export type DashboardState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: Dashboard }
  | { kind: 'error'; message: MessageKey };

/** Enough to count every farm a pilot farmer could have in one request. */
const FARMS_FOR_SUMMARY = 100;

export function useDashboard() {
  const [sample, setSample] = useState(false);
  const [real, setReal] = useState<DashboardState>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    Promise.all([
      apiClient.farms.list(1, FARMS_FOR_SUMMARY),
      apiClient.cycles.list('open', 1, FARMS_FOR_SUMMARY),
      apiClient.calendar.get(),
    ])
      .then(([farms, cycles, calendar]) => {
        if (!live) return;
        const plots = farms.items.reduce((sum, farm) => sum + farm.plotCount, 0);
        setReal({
          kind: 'ok',
          data: {
            ...EMPTY_DASHBOARD,
            summary: { ...EMPTY_DASHBOARD.summary, farms: farms.meta.total, plots, activeCrops: cycles.meta.total },
            activeCrops: cycles.items.map((cycle) => ({ ...cycle, stage: null, stageNumber: null, stageCount: null })),
            // From the one farm calendar: the next things to do, and what was done lately.
            upcoming: comingUp(calendar.entries, calendar.today)
              .filter((entry) => entry.kind !== 'event' && entry.cycleId && entry.crop)
              .slice(0, 5)
              .map((entry) => ({
                id: `${entry.cycleId}-${entry.kind}-${entry.key}`,
                cycleId: entry.cycleId!,
                task: entry.key,
                crop: entry.crop!,
                customCrop: entry.customCrop,
                plotName: entry.plotName ?? '',
                dueOn: entry.startsOn > calendar.today ? entry.startsOn : calendar.today,
              })),
            recent: done(calendar.entries)
              .slice(0, 5)
              .map((entry) => ({
                id: entry.activityId ?? `${entry.cycleId}-${entry.startsOn}`,
                cycleId: entry.cycleId!,
                kind: entry.key as ActivityKind,
                crop: entry.crop!,
                customCrop: entry.customCrop,
                plotName: entry.plotName ?? '',
                doneOn: entry.startsOn,
                costKes: entry.costKes,
              })),
          },
        });
      })
      .catch((err: unknown) => {
        if (live) setReal({ kind: 'error', message: err instanceof ApiClientError ? err.userMessage : 'error.generic' });
      });
    return () => {
      live = false;
    };
  }, []);

  const state = useMemo<DashboardState>(() => (sample ? { kind: 'ok', data: sampleDashboard() } : real), [sample, real]);

  return {
    state,
    /** True while sample data is on screen. */
    sample,
    /** Only offered in development builds. */
    canSample: import.meta.env.DEV,
    toggleSample: () => setSample((value) => !value),
  };
}
