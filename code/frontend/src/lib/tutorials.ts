// The picture tutorials, by id. Each is a few steps of one drawing, one short title
// and one line. To add one: add its text to lib/i18n/app.*.ts, list its steps here,
// and call useTutorial('<id>') on the screen it belongs to.
import type { ComponentType } from 'react';
import {
  AddPlotIllustration,
  ChooseCropIllustration,
  NameFarmIllustration,
  PlantingDateIllustration,
  PlotSizeIllustration,
  RecordWorkIllustration,
} from '@/components/app/TutorialIllustrations';
import {
  CostLogIllustration,
  CropCalendarIllustration,
  CropHealthIllustration,
  FarmPlotsIllustration,
} from '@/components/marketing/Illustrations';
import type { MessageKey } from '@/lib/i18n';

export interface TutorialStep {
  title: MessageKey;
  body: MessageKey;
  Art: ComponentType<{ className?: string }>;
}

export const TUTORIALS = {
  /** Home: what the app is for. */
  welcome: [
    { title: 'app.tour.farms.title', body: 'app.tour.farms.body', Art: FarmPlotsIllustration },
    { title: 'app.tour.crops.title', body: 'app.tour.crops.body', Art: CropCalendarIllustration },
    { title: 'app.tour.costs.title', body: 'app.tour.costs.body', Art: CostLogIllustration },
    { title: 'app.tour.health.title', body: 'app.tour.health.body', Art: CropHealthIllustration },
  ],
  /** Farms: how to add a farm and its plots. */
  farms: [
    { title: 'app.tutorial.farms.name.title', body: 'app.tutorial.farms.name.body', Art: NameFarmIllustration },
    { title: 'app.tutorial.farms.plots.title', body: 'app.tutorial.farms.plots.body', Art: AddPlotIllustration },
    { title: 'app.tutorial.farms.size.title', body: 'app.tutorial.farms.size.body', Art: PlotSizeIllustration },
  ],
  /** Crops: how to start a crop and keep its record. */
  crops: [
    { title: 'app.tutorial.crops.pick.title', body: 'app.tutorial.crops.pick.body', Art: ChooseCropIllustration },
    { title: 'app.tutorial.crops.date.title', body: 'app.tutorial.crops.date.body', Art: PlantingDateIllustration },
    { title: 'app.tutorial.crops.follow.title', body: 'app.tutorial.crops.follow.body', Art: CropCalendarIllustration },
    { title: 'app.tutorial.crops.record.title', body: 'app.tutorial.crops.record.body', Art: RecordWorkIllustration },
  ],
} as const satisfies Record<string, readonly TutorialStep[]>;

export type TutorialId = keyof typeof TUTORIALS;
