// Shapes the Home dashboard renders, all from real endpoints (see hooks/use-dashboard.ts);
// the dev-only sample (lib/sample/dashboard.ts) fills the same shapes for design review.
import type { ActivityKind, CropCycle, CropSlug } from '@/types/crop';

export interface DashboardSummary {
  farms: number;
  plots: number;
  activeCrops: number;
  /** Total logged cost of the active crops, whole KES (not available yet; 0). */
  seasonCostKes: number;
  /** How many activities the farmer has logged (drives the setup steps). */
  activitiesLogged: number;
}

/** An open crop cycle; the stage fields are filled only when its crop has a sourced calendar. */
export interface ActiveCrop extends CropCycle {
  stage: string | null;
  stageNumber: number | null;
  stageCount: number | null;
}

export interface UpcomingActivity {
  id: string;
  cycleId: string;
  task: string;
  crop: CropSlug;
  customCrop: string | null;
  plotName: string;
  /** YYYY-MM-DD */
  dueOn: string;
}

export interface LoggedActivity {
  id: string;
  cycleId: string;
  kind: ActivityKind;
  crop: CropSlug;
  customCrop: string | null;
  plotName: string;
  /** YYYY-MM-DD */
  doneOn: string;
  costKes: number | null;
}

export interface Dashboard {
  summary: DashboardSummary;
  activeCrops: ActiveCrop[];
  upcoming: UpcomingActivity[];
  recent: LoggedActivity[];
}
