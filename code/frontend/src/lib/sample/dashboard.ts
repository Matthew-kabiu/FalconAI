// SAMPLE DATA for design review only. Shown in development when the reviewer turns it
// on, always under a visible "Sample data" banner. Never shipped as real records.
// Dates are relative to today so the screen always looks like a live mid-season day.
import { isoDayFromToday } from '@/lib/format';
import type { ActiveCrop, Dashboard } from '@/types/dashboard';

export const EMPTY_DASHBOARD: Dashboard = {
  summary: { farms: 0, plots: 0, activeCrops: 0, seasonCostKes: 0, activitiesLogged: 0 },
  activeCrops: [],
  upcoming: [],
  recent: [],
};

const sampleCrop = (overrides: Partial<ActiveCrop>): ActiveCrop => ({
  id: 'sample',
  plotId: 'sample-plot',
  farmId: 'sample-farm',
  plotName: 'Upper plot',
  farmName: 'Home farm',
  crop: 'maize',
  customCrop: null,
  variety: null,
  plantedOn: isoDayFromToday(-41),
  status: 'active',
  createdAt: '',
  updatedAt: '',
  stage: null,
  stageNumber: null,
  stageCount: null,
  ...overrides,
});

export function sampleDashboard(): Dashboard {
  return {
    summary: { farms: 1, plots: 3, activeCrops: 2, seasonCostKes: 7_350, activitiesLogged: 5 },
    activeCrops: [
      sampleCrop({ id: 'sample-maize', stage: 'vegetative', stageNumber: 2, stageCount: 5 }),
      sampleCrop({ id: 'sample-beans', crop: 'beans', plotName: 'River plot', plantedOn: isoDayFromToday(-36) }),
    ],
    upcoming: [
      { id: 'u1', cycleId: 'sample-beans', task: 'first_weeding', crop: 'beans', customCrop: null, plotName: 'River plot', dueOn: isoDayFromToday(0) },
      { id: 'u2', cycleId: 'sample-maize', task: 'top_dressing', crop: 'maize', customCrop: null, plotName: 'Upper plot', dueOn: isoDayFromToday(1) },
    ],
    recent: [
      { id: 'r1', cycleId: 'sample-maize', kind: 'weeding', crop: 'maize', customCrop: null, plotName: 'Upper plot', doneOn: isoDayFromToday(-3), costKes: 1_200 },
      { id: 'r2', cycleId: 'sample-beans', kind: 'planting', crop: 'beans', customCrop: null, plotName: 'River plot', doneOn: isoDayFromToday(-36), costKes: 2_400 },
    ],
  };
}
