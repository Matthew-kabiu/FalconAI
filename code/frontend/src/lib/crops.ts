// Display names, icons and order for crops, statuses, activity kinds, units and
// calendar keys. Screens look labels up here, so a missing label fails the type check.
import {
  Bean,
  Droplets,
  Hand,
  Leaf,
  Shovel,
  Sprout,
  SprayCan,
  Tractor,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import type { MessageKey } from '@/lib/i18n';
import type { ActivityKind, CropCycle, CropSlug, CycleStatus, QuantityUnit } from '@/types/crop';

/** Catalogue order shown to farmers; `other` always last. Mirrors falcon-core. */
export const CROP_ORDER: readonly CropSlug[] = [
  'maize',
  'beans',
  'sorghum',
  'finger_millet',
  'pearl_millet',
  'rice',
  'green_grams',
  'cowpeas',
  'pigeon_peas',
  'cassava',
  'irish_potatoes',
  'sweet_potatoes',
  'bananas',
  'other',
];

export const CROP_LABELS: Record<CropSlug, MessageKey> = {
  maize: 'crop.maize',
  sorghum: 'crop.sorghum',
  finger_millet: 'crop.finger_millet',
  pearl_millet: 'crop.pearl_millet',
  rice: 'crop.rice',
  beans: 'crop.beans',
  green_grams: 'crop.green_grams',
  cowpeas: 'crop.cowpeas',
  pigeon_peas: 'crop.pigeon_peas',
  cassava: 'crop.cassava',
  irish_potatoes: 'crop.irish_potatoes',
  sweet_potatoes: 'crop.sweet_potatoes',
  bananas: 'crop.bananas',
  other: 'crop.other',
};

const GRAINS: readonly CropSlug[] = ['maize', 'sorghum', 'finger_millet', 'pearl_millet', 'rice'];
const PULSES: readonly CropSlug[] = ['beans', 'green_grams', 'cowpeas', 'pigeon_peas'];

/** A simple icon per crop family: grains, pulses, everything else. */
export const cropIcon = (crop: CropSlug): LucideIcon =>
  GRAINS.includes(crop) ? Wheat : PULSES.includes(crop) ? Bean : Sprout;

type T = (key: MessageKey) => string;

/** "Maize", or the farmer's own name for an `other` crop. */
export const cropName = (cycle: Pick<CropCycle, 'crop' | 'customCrop'>, t: T): string =>
  cycle.crop === 'other' && cycle.customCrop ? cycle.customCrop : t(CROP_LABELS[cycle.crop]);

export const STATUS_LABELS: Record<CycleStatus, MessageKey> = {
  planned: 'cycle.status.planned',
  active: 'cycle.status.active',
  harvested: 'cycle.status.harvested',
  abandoned: 'cycle.status.abandoned',
};

export const ACTIVITY_ORDER: readonly ActivityKind[] = [
  'land_preparation',
  'planting',
  'weeding',
  'fertiliser',
  'pest_disease_control',
  'irrigation',
  'harvest',
  'other',
];

export const ACTIVITY_LABELS: Record<ActivityKind, MessageKey> = {
  land_preparation: 'activity.land_preparation',
  planting: 'activity.planting',
  weeding: 'activity.weeding',
  fertiliser: 'activity.fertiliser',
  pest_disease_control: 'activity.pest_disease_control',
  irrigation: 'activity.irrigation',
  harvest: 'activity.harvest',
  other: 'activity.other',
};

export const ACTIVITY_ICONS: Record<ActivityKind, LucideIcon> = {
  land_preparation: Tractor,
  planting: Sprout,
  weeding: Shovel,
  fertiliser: Leaf,
  pest_disease_control: SprayCan,
  irrigation: Droplets,
  harvest: Wheat,
  other: Hand,
};

export const UNIT_ORDER: readonly QuantityUnit[] = ['kg', 'bags', 'litres', 'g', 'ml', 'pieces', 'person_days'];

export const UNIT_LABELS: Record<QuantityUnit, MessageKey> = {
  kg: 'unit.kg',
  g: 'unit.g',
  litres: 'unit.litres',
  ml: 'unit.ml',
  bags: 'unit.bags',
  pieces: 'unit.pieces',
  person_days: 'unit.person_days',
};

/**
 * Calendar stage and task keys come from falcon-core's sourced tables. A key with
 * no label yet shows a readable fallback ("grain fill") instead of breaking.
 */
export function calendarLabel(key: string, t: T, has: (key: string) => key is MessageKey): string {
  const stage = `calendar.${key}`;
  return has(stage) ? t(stage) : key.replace(/_/g, ' ');
}
