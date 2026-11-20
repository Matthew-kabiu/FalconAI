// Form checks for crop cycles and activities, mirroring the falcon-core rules exactly
// (api/openapi.yaml → CropCycleInput, ActivityInput). The API re-checks everything;
// its 422 issues map back onto the same fields with serverIssues().
import { z } from 'zod';
import { isoDayFromToday } from '@/lib/format';
import type { MessageKey } from '@/lib/i18n';
import type { FieldIssue } from '@/types/api';
import type { ActivityInput, ActivityKind, CropCycleInput, CropSlug, QuantityUnit } from '@/types/crop';

export const CUSTOM_CROP_MAX = 60;
export const VARIETY_MAX = 80;
export const INPUT_MAX = 80;
export const NOTES_MAX = 500;
export const QUANTITY_MAX = 100_000;
export const COST_MAX = 10_000_000;
/** How far back and ahead a planting date may be (days), as in falcon-core. */
export const PLANTED_DAYS_BACK = 365;
export const PLANTED_DAYS_AHEAD = 183;
/** Land can be prepared up to this many days before planting. */
export const PREP_DAYS_BEFORE_PLANTING = 60;

const key = (messageKey: MessageKey) => messageKey;
const optionalText = (max: number, tooLong: MessageKey) =>
  z
    .string()
    .trim()
    .max(max, key(tooLong))
    .transform((value) => (value === '' ? null : value));

export const plantedOnRange = () => ({ min: isoDayFromToday(-PLANTED_DAYS_BACK), max: isoDayFromToday(PLANTED_DAYS_AHEAD) });

/** Farmers' date limits for an activity on a crop planted on `plantedOn`. */
export function doneOnRange(plantedOn: string) {
  const [year, month, day] = plantedOn.split('-').map(Number);
  const earliest = new Date(year, month - 1, day - PREP_DAYS_BEFORE_PLANTING);
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    min: `${earliest.getFullYear()}-${pad(earliest.getMonth() + 1)}-${pad(earliest.getDate())}`,
    max: isoDayFromToday(0),
  };
}

export interface CycleFormValues {
  crop: CropSlug | '';
  customCrop: string;
  variety: string;
  plantedOn: string;
}

export function cycleSchema() {
  const { min, max } = plantedOnRange();
  return z
    .object({
      crop: z.string().min(1, key('cycle.issue.crop')),
      customCrop: z.string().trim(),
      variety: optionalText(VARIETY_MAX, 'cycle.issue.varietyTooLong'),
      plantedOn: z
        .string()
        .min(1, key('cycle.issue.plantedRequired'))
        .refine((value) => value >= min && value <= max, key('cycle.issue.plantedRange')),
    })
    .superRefine((value, ctx) => {
      if (value.crop !== 'other') return;
      if (!value.customCrop) ctx.addIssue({ code: 'custom', path: ['customCrop'], message: key('cycle.issue.customRequired') });
      else if (value.customCrop.length > CUSTOM_CROP_MAX)
        ctx.addIssue({ code: 'custom', path: ['customCrop'], message: key('cycle.issue.customTooLong') });
    })
    .transform(
      (value): CropCycleInput => ({
        crop: value.crop as CropSlug,
        customCrop: value.crop === 'other' ? value.customCrop : null,
        variety: value.variety,
        plantedOn: value.plantedOn,
      }),
    );
}

export interface ActivityFormValues {
  kind: ActivityKind | '';
  doneOn: string;
  input: string;
  quantity: string;
  quantityUnit: QuantityUnit | '';
  costKes: string;
  notes: string;
}

const toNumber = (value: string) => Number(value.replace(/[\s,]/g, '').replace(/^(\d*)[.,](\d*)$/, '$1.$2'));

export function activitySchema(plantedOn: string) {
  const { min, max } = doneOnRange(plantedOn);
  return z
    .object({
      kind: z.string().min(1, key('activity.issue.kind')),
      doneOn: z
        .string()
        .min(1, key('activity.issue.dateRequired'))
        .refine((value) => value >= min && value <= max, key('activity.issue.dateRange')),
      input: optionalText(INPUT_MAX, 'activity.issue.inputTooLong'),
      quantity: z.string().trim(),
      quantityUnit: z.string(),
      costKes: z.string().trim(),
      notes: optionalText(NOTES_MAX, 'activity.issue.notesTooLong'),
    })
    .superRefine((value, ctx) => {
      if (value.quantity) {
        const amount = toNumber(value.quantity);
        if (!Number.isFinite(amount) || amount <= 0 || amount > QUANTITY_MAX)
          ctx.addIssue({ code: 'custom', path: ['quantity'], message: key('activity.issue.quantityRange') });
        if (!value.quantityUnit) ctx.addIssue({ code: 'custom', path: ['quantityUnit'], message: key('activity.issue.unitRequired') });
      } else if (value.quantityUnit) {
        ctx.addIssue({ code: 'custom', path: ['quantity'], message: key('activity.issue.quantityRequired') });
      }
      if (value.costKes) {
        const cost = toNumber(value.costKes);
        if (!Number.isInteger(cost) || cost < 0 || cost > COST_MAX)
          ctx.addIssue({ code: 'custom', path: ['costKes'], message: key('activity.issue.costRange') });
      }
    })
    .transform(
      (value): ActivityInput => ({
        kind: value.kind as ActivityKind,
        doneOn: value.doneOn,
        input: value.input,
        quantity: value.quantity ? Math.round(toNumber(value.quantity) * 100) / 100 : null,
        quantityUnit: value.quantity ? (value.quantityUnit as QuantityUnit) : null,
        costKes: value.costKes ? toNumber(value.costKes) : null,
        notes: value.notes,
      }),
    );
}

// Server issues (falcon-core codes) → the same messages the forms show themselves.
const SERVER_MESSAGES: Record<string, Partial<Record<FieldIssue['code'], MessageKey>>> = {
  'cycle.crop': { required: 'cycle.issue.crop', invalid_choice: 'cycle.issue.crop' },
  'cycle.customCrop': { required: 'cycle.issue.customRequired', too_long: 'cycle.issue.customTooLong' },
  'cycle.variety': { too_long: 'cycle.issue.varietyTooLong' },
  'cycle.plantedOn': { required: 'cycle.issue.plantedRequired', out_of_range: 'cycle.issue.plantedRange' },
  'activity.kind': { required: 'activity.issue.kind', invalid_choice: 'activity.issue.kind' },
  'activity.doneOn': { required: 'activity.issue.dateRequired', out_of_range: 'activity.issue.dateRange' },
  'activity.input': { too_long: 'activity.issue.inputTooLong' },
  'activity.quantity': {
    required: 'activity.issue.quantityRequired',
    out_of_range: 'activity.issue.quantityRange',
    not_allowed: 'activity.issue.quantityRequired',
  },
  'activity.quantityUnit': { required: 'activity.issue.unitRequired', invalid_choice: 'activity.issue.unitRequired' },
  'activity.costKes': { out_of_range: 'activity.issue.costRange' },
  'activity.notes': { too_long: 'activity.issue.notesTooLong' },
};

export function serverIssues<Field extends string>(
  form: 'cycle' | 'activity',
  issues: readonly FieldIssue[],
): Partial<Record<Field, MessageKey>> {
  const errors: Partial<Record<string, MessageKey>> = {};
  for (const { field, code } of issues) {
    errors[field] ??= SERVER_MESSAGES[`${form}.${field}`]?.[code] ?? 'error.validation';
  }
  return errors as Partial<Record<Field, MessageKey>>;
}
