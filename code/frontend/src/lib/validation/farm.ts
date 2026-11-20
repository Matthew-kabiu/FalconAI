// Form checks for farms and plots. They mirror the falcon-core rules exactly
// (api/openapi.yaml → FarmInput, PlotInput) so farmers get instant feedback; the
// API re-checks everything and its 422 issues are mapped back onto the same fields.
import { z } from 'zod';
import { isCounty, type County } from '@/lib/counties';
import type { MessageKey } from '@/lib/i18n';
import type { FieldIssue } from '@/types/api';
import type { FarmInput, PlotInput, SizeUnit } from '@/types/farm';

export const NAME_MAX = 80;
export const LOCALITY_MAX = 80;
export const NOTES_MAX = 500;
export const SIZE_MAX = 1000;

const key = (messageKey: MessageKey) => messageKey;
const optionalText = (max: number, tooLong: MessageKey) =>
  z
    .string()
    .trim()
    .max(max, key(tooLong))
    .transform((value) => (value === '' ? null : value));

export const farmSchema = z.object({
  name: z.string().trim().min(1, key('farms.issue.nameRequired')).max(NAME_MAX, key('farms.issue.nameTooLong')),
  county: z.string().refine(isCounty, key('farms.issue.county')),
  locality: optionalText(LOCALITY_MAX, 'farms.issue.localityTooLong'),
});

export const plotSchema = z.object({
  name: z.string().trim().min(1, key('plots.issue.nameRequired')).max(NAME_MAX, key('plots.issue.nameTooLong')),
  // Typed as text so "0,5" and "0.5" both work; stored to 2 decimal places.
  size: z
    .string()
    .trim()
    .min(1, key('plots.issue.sizeRequired'))
    .transform((value) => Number(value.replace(',', '.')))
    .refine((value) => Number.isFinite(value) && value > 0 && value <= SIZE_MAX, key('plots.issue.sizeRange'))
    .transform((value) => Math.round(value * 100) / 100),
  sizeUnit: z.enum(['acres', 'hectares', 'plots_50x100'], { error: key('plots.issue.unit') }),
  notes: optionalText(NOTES_MAX, 'plots.issue.notesTooLong'),
});

/** What the farm form holds while typing. */
export interface FarmFormValues {
  name: string;
  county: County | '';
  locality: string;
}

/**
 * The size choices farmers recognise. The first three fill in size and unit for
 * them; `other` lets them type any size in acres, hectares or 50 by 100 plots.
 */
export const SIZE_PRESETS = {
  p50x100: { size: '1', sizeUnit: 'plots_50x100' },
  p100x100: { size: '2', sizeUnit: 'plots_50x100' },
  acre1: { size: '1', sizeUnit: 'acres' },
} as const satisfies Record<string, { size: string; sizeUnit: SizeUnit }>;

export type SizePreset = keyof typeof SIZE_PRESETS | 'other';

/** Which preset a stored size matches, or `other`. */
export function presetFor(size: string, sizeUnit: SizeUnit): SizePreset {
  const match = (Object.keys(SIZE_PRESETS) as (keyof typeof SIZE_PRESETS)[]).find(
    (preset) => SIZE_PRESETS[preset].sizeUnit === sizeUnit && Number(SIZE_PRESETS[preset].size) === Number(size),
  );
  return match ?? 'other';
}

/** What the plot form holds while typing. */
export interface PlotFormValues {
  name: string;
  sizePreset: SizePreset;
  size: string;
  sizeUnit: SizeUnit;
  notes: string;
}

export const toFarmInput = (data: z.output<typeof farmSchema>): FarmInput => ({ ...data, county: data.county as County });
export const toPlotInput = (data: z.output<typeof plotSchema>): PlotInput => data;

// Server issues (falcon-core codes) → the same messages the form shows itself.
const SERVER_MESSAGES: Record<string, Partial<Record<FieldIssue['code'], MessageKey>>> = {
  'farm.name': { required: 'farms.issue.nameRequired', too_long: 'farms.issue.nameTooLong' },
  'farm.county': { required: 'farms.issue.county', invalid_choice: 'farms.issue.county' },
  'farm.locality': { too_long: 'farms.issue.localityTooLong' },
  'plot.name': { required: 'plots.issue.nameRequired', too_long: 'plots.issue.nameTooLong' },
  'plot.size': { required: 'plots.issue.sizeRequired', out_of_range: 'plots.issue.sizeRange' },
  'plot.sizeUnit': { required: 'plots.issue.unit', invalid_choice: 'plots.issue.unit' },
  'plot.notes': { too_long: 'plots.issue.notesTooLong' },
};

/** Turns a 422's issues into one message key per field. Unknown codes get a generic message. */
export function serverFieldErrors<Field extends string>(
  form: 'farm' | 'plot',
  issues: readonly FieldIssue[],
): Partial<Record<Field, MessageKey>> {
  const errors: Partial<Record<string, MessageKey>> = {};
  for (const { field, code } of issues) {
    errors[field] ??= SERVER_MESSAGES[`${form}.${field}`]?.[code] ?? 'error.validation';
  }
  return errors as Partial<Record<Field, MessageKey>>;
}
