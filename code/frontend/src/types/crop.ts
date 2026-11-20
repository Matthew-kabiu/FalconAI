// Crops, crop cycles, the crop calendar and activities as falcon-api returns them
// (api/openapi.yaml → CatalogueCrop, CropCycle, CropCycleDetail, CropCalendar, Activity).
export type CropSlug =
  | 'maize'
  | 'sorghum'
  | 'finger_millet'
  | 'pearl_millet'
  | 'rice'
  | 'beans'
  | 'green_grams'
  | 'cowpeas'
  | 'pigeon_peas'
  | 'cassava'
  | 'irish_potatoes'
  | 'sweet_potatoes'
  | 'bananas'
  | 'other';

export interface CatalogueCrop {
  crop: CropSlug;
  /** True when this crop's growth stages come from a published reference. */
  hasCalendar: boolean;
  /** True when crop-health checks will cover it (pilot: maize and beans). */
  healthCheck: boolean;
}

export type CycleStatus = 'planned' | 'active' | 'harvested' | 'abandoned';

export interface CropCycle {
  id: string;
  plotId: string;
  farmId: string;
  plotName: string;
  farmName: string;
  crop: CropSlug;
  customCrop: string | null;
  variety: string | null;
  /** YYYY-MM-DD */
  plantedOn: string;
  status: CycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEntry {
  key: string;
  startDay: number;
  endDay: number;
  startsOn: string;
  endsOn: string;
}

export interface CropCalendar {
  stages: CalendarEntry[];
  tasks: CalendarEntry[];
  currentStage: string | null;
  source: string;
  reviewed: boolean;
}

export interface CropCycleDetail extends CropCycle {
  seasonCostKes: number;
  activityCount: number;
  calendar: CropCalendar | null;
}

export interface CropCycleInput {
  crop: CropSlug;
  customCrop: string | null;
  variety: string | null;
  plantedOn: string;
}

export type CropCyclePatch = Partial<Pick<CropCycleInput, 'variety' | 'plantedOn'>> & { status?: CycleStatus };

export type ActivityKind =
  | 'land_preparation'
  | 'planting'
  | 'weeding'
  | 'fertiliser'
  | 'pest_disease_control'
  | 'irrigation'
  | 'harvest'
  | 'other';

export type QuantityUnit = 'kg' | 'g' | 'litres' | 'ml' | 'bags' | 'pieces' | 'person_days';

export interface Activity {
  id: string;
  cycleId: string;
  kind: ActivityKind;
  doneOn: string;
  input: string | null;
  quantity: number | null;
  quantityUnit: QuantityUnit | null;
  costKes: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityInput {
  kind: ActivityKind;
  doneOn: string;
  input: string | null;
  quantity: number | null;
  quantityUnit: QuantityUnit | null;
  costKes: number | null;
  notes: string | null;
}

/** One dated item on the whole-farm calendar (api/openapi.yaml → FarmCalendarEntry). */
export interface FarmCalendarEntry {
  /** `stage` / `task` from the crop's sourced table; `activity` = logged work; `event` = the farmer's own. */
  kind: 'stage' | 'task' | 'activity' | 'event';
  key: string;
  startsOn: string;
  endsOn: string;
  /** Null only for an event not linked to a crop (so are crop, plotName and farmName). */
  cycleId: string | null;
  crop: CropSlug | null;
  customCrop: string | null;
  plotName: string | null;
  farmName: string | null;
  activityId: string | null;
  costKes: number | null;
  eventId: string | null;
  /** The farmer's own words, for events. */
  title: string | null;
  /** 'HH:MM' Kenya time, for events that have a time. */
  time: string | null;
  /** False until an agricultural professional has checked the timings. */
  reviewed: boolean;
}

export interface FarmCalendar {
  from: string;
  to: string;
  today: string;
  /** Always 'Africa/Nairobi': every date and time is Kenya time. */
  timeZone: string;
  entries: FarmCalendarEntry[];
  /** Open crops with no sourced calendar (not shown, records still kept). */
  cropsWithoutCalendar: number;
}

/** Something the farmer put on the calendar themselves (api/openapi.yaml → Event). */
export interface FarmEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  /** 'HH:MM' Kenya time, or null for an all-day event. */
  time: string | null;
  cycleId: string | null;
  crop: CropSlug | null;
  customCrop: string | null;
  plotName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FarmEventInput {
  title: string;
  description: string | null;
  date: string;
  /** Null for an all-day event. */
  time: string | null;
  /** The API still accepts a crop link; the form no longer asks for one (Matt, 2026-11-19). */
  cycleId?: string | null;
  notes: string | null;
}
