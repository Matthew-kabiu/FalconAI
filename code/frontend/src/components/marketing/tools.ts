// The four tools Falcon AI offers, in the order a farmer meets them. Shared by the
// Home page (short cards) and the Features page (full rows), so they never drift apart.
import type { ComponentType } from 'react';
import {
  CostLogIllustration,
  CropCalendarIllustration,
  CropHealthIllustration,
  FarmPlotsIllustration,
} from '@/components/marketing/Illustrations';
import type { MessageKey } from '@/lib/i18n/en';

export interface Tool {
  /** Anchor id on the Features page. */
  id: string;
  title: MessageKey;
  short: MessageKey;
  body: MessageKey;
  points: readonly MessageKey[];
  Art: ComponentType<{ className?: string }>;
  /** `first`: in the first release. `later`: opens later in the pilot. */
  status: 'first' | 'later';
}

export const TOOLS: readonly Tool[] = [
  {
    id: 'farms',
    title: 'site.tool.farm.title',
    short: 'site.tool.farm.short',
    body: 'site.tool.farm.body',
    points: ['site.tool.farm.point1', 'site.tool.farm.point2', 'site.tool.farm.point3'],
    Art: FarmPlotsIllustration,
    status: 'first',
  },
  {
    id: 'calendar',
    title: 'site.tool.calendar.title',
    short: 'site.tool.calendar.short',
    body: 'site.tool.calendar.body',
    points: ['site.tool.calendar.point1', 'site.tool.calendar.point2', 'site.tool.calendar.point3'],
    Art: CropCalendarIllustration,
    status: 'first',
  },
  {
    id: 'costs',
    title: 'site.tool.costs.title',
    short: 'site.tool.costs.short',
    body: 'site.tool.costs.body',
    points: ['site.tool.costs.point1', 'site.tool.costs.point2', 'site.tool.costs.point3'],
    Art: CostLogIllustration,
    status: 'first',
  },
  {
    id: 'health',
    title: 'site.tool.health.title',
    short: 'site.tool.health.short',
    body: 'site.tool.health.body',
    points: ['site.tool.health.point1', 'site.tool.health.point2', 'site.tool.health.point3'],
    Art: CropHealthIllustration,
    status: 'later',
  },
];
