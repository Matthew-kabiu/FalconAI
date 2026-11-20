// Home dashboard (DESIGN.md → Product surfaces; VISION.md: "The farmer dashboard shows
// registered plots, active crops, upcoming activities and recent crop-health
// assessments"). This screen is the reference for every signed-in screen.
// Built for farmers with varied digital confidence, so: pictures before words, short
// titles, one obvious next tap, and nothing empty on show.
//   New farmer  → greeting, the three picture steps, the "coming later" card.
//   With records → the same steps until all are done, then figures and lists.
// A picture tour opens the first time (tracked on the account) and again from "Show me around".
import { useUser } from '@clerk/react';
import { Banknote, CalendarDays, CircleAlert, CircleHelp, ClipboardList, LandPlot, RefreshCw, ScanSearch, Sprout } from 'lucide-react';
import { EmptyState } from '@/components/app/EmptyState';
import { PageHeader } from '@/components/app/PageHeader';
import { Panel } from '@/components/app/Panel';
import { SampleSwitch } from '@/components/app/SampleSwitch';
import { StartSteps, type StartStep } from '@/components/app/StartSteps';
import { StatTile } from '@/components/app/StatTile';
import { Tutorial } from '@/components/app/Tutorial';
import { LoadingState } from '@/components/feedback/LoadingState';
import {
  CostLogIllustration,
  CropCalendarIllustration,
  CropHealthIllustration,
  FarmPlotsIllustration,
} from '@/components/marketing/Illustrations';
import { Button } from '@/components/ui/Button';
import { TextLink } from '@/components/ui/TextLink';
import { useDashboard } from '@/hooks/use-dashboard';
import { useLanguage } from '@/hooks/use-language';
import { useTutorial } from '@/hooks/use-tutorial';
import { ACTIVITY_LABELS, calendarLabel, cropIcon, cropName } from '@/lib/crops';
import { daysFromToday, formatDay, formatKes, formatLongDate } from '@/lib/format';
import { isMessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';
import type { Dashboard } from '@/types/dashboard';

export default function HomePage() {
  const { user } = useUser();
  const { language, t } = useLanguage();
  const { state, sample, canSample, toggleSample } = useDashboard();
  const firstName = user?.firstName?.trim();
  // The welcome tour opens by itself the first time, then only when asked for.
  const tour = useTutorial('welcome');

  return (
    <div className="grid gap-[clamp(1.5rem,3.5vw,2.5rem)]">
      <PageHeader
        title={firstName ? `${t('home.greeting')} ${firstName}` : t('home.greetingNoName')}
        lead={formatLongDate(new Date(), language)}
        actions={
          <Button icon={CircleHelp} variant="secondary" className="min-h-[3rem]" onClick={tour.show}>
            {t('app.tour.open')}
          </Button>
        }
      />

      {state.kind === 'loading' && <LoadingState />}

      {state.kind === 'error' && (
        <div className="rounded-[1rem] bg-surface p-[1.5rem]" role="alert">
          <p className="flex items-start gap-[0.6em] text-danger">
            <CircleAlert className="mt-[0.15em] size-[1.25em] shrink-0" aria-hidden="true" />
            {t(state.message)}
          </p>
          <Button className="mt-[1rem] min-h-[3rem] w-full sm:w-auto" icon={RefreshCw} onClick={() => window.location.reload()}>
            {t('common.tryAgain')}
          </Button>
        </div>
      )}

      {state.kind === 'ok' && <DashboardBody data={state.data} />}

      {/* Development-only design-review control, kept out of the farmer's way. */}
      {canSample && <SampleSwitch on={sample} onToggle={toggleSample} />}

      <Tutorial steps={tour.steps} open={tour.open} onClose={tour.close} />
    </div>
  );
}

function DashboardBody({ data }: { data: Dashboard }) {
  const { language, t } = useLanguage();
  const { summary, activeCrops, upcoming, recent } = data;

  const steps: readonly StartStep[] = [
    {
      title: 'app.home.step.farm.title',
      body: 'app.home.step.farm.body',
      Art: FarmPlotsIllustration,
      to: ROUTES.pages.app.farms,
      done: summary.plots > 0,
    },
    {
      title: 'app.home.step.crop.title',
      body: 'app.home.step.crop.body',
      Art: CropCalendarIllustration,
      to: ROUTES.pages.app.crops,
      done: summary.activeCrops > 0,
    },
    {
      title: 'app.home.step.activity.title',
      body: 'app.home.step.activity.body',
      Art: CostLogIllustration,
      to: ROUTES.pages.app.crops,
      done: summary.activitiesLogged > 0,
    },
  ];
  const settingUp = steps.some((step) => !step.done);
  // Until there is a farm there is nothing to summarise: show the guide, not boxes of zeros.
  const hasRecords = summary.farms > 0;

  const dueLabel = (iso: string) => {
    const days = daysFromToday(iso);
    if (days === 0) return t('app.today');
    if (days === 1) return t('app.tomorrow');
    return formatDay(iso, language);
  };

  return (
    <>
      {settingUp && <StartSteps steps={steps} />}

      {hasRecords && (
        <>
          {/* Summary: four figures in one group. Season cost is the one farmers ask about most. */}
          <dl aria-label={t('app.stats.label')} className="grid grid-cols-2 gap-[clamp(0.75rem,1.5vw,1rem)] lg:grid-cols-4">
            <StatTile icon={LandPlot} label={t('app.stats.farms')} value={String(summary.farms)} />
            <StatTile icon={LandPlot} label={t('app.stats.plots')} value={String(summary.plots)} />
            <StatTile icon={Sprout} label={t('app.stats.activeCrops')} value={String(summary.activeCrops)} />
            <StatTile icon={Banknote} label={t('app.stats.seasonCost')} value={formatKes(summary.seasonCostKes, language)} emphasis />
          </dl>

          {/* What needs doing sits beside what is growing: the two are read together. */}
          <div className="grid gap-[clamp(0.75rem,1.5vw,1rem)] lg:grid-cols-[1.6fr_1fr] lg:items-start">
            <Panel
              id="crops-title"
              title={t('app.home.crops.title')}
              action={activeCrops.length > 0 && <TextLink to={ROUTES.pages.app.crops}>{t('app.viewAll')}</TextLink>}
            >
              {activeCrops.length === 0 ? (
                <EmptyState icon={Sprout} body={t('app.home.crops.empty')} />
              ) : (
                <ul className="grid list-none gap-[0.75rem] p-0 sm:grid-cols-2">
                  {activeCrops.map((crop) => {
                    const CropIcon = cropIcon(crop.crop);
                    return (
                      <li key={crop.id}>
                        <Link
                          to={ROUTES.pages.app.crop(crop.id)}
                          className="block h-full rounded-[0.85rem] bg-bg p-[1.1rem] transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                        <div className="flex items-center gap-[0.75em]">
                          <span className="flex size-[2.75rem] shrink-0 items-center justify-center rounded-[0.75rem] bg-leaf-soft">
                            <CropIcon className="size-[1.4em] text-primary" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-semibold leading-tight">{cropName(crop, t)}</h3>
                            <p className="text-[0.875rem] text-muted">
                              {crop.plotName}, {crop.farmName}
                            </p>
                          </div>
                        </div>
                        {/* Stage (only for crops with a sourced calendar): words first, then a segmented bar. */}
                        {crop.stage && crop.stageNumber !== null && crop.stageCount !== null && (
                          <>
                            <p className="mt-[1rem] font-medium">{calendarLabel(crop.stage, t, isMessageKey)}</p>
                            <p className="text-[0.875rem] tabular-nums text-muted">
                              {t('app.home.crops.stage')} {crop.stageNumber} {t('app.home.crops.of')} {crop.stageCount}
                            </p>
                            <div className="mt-[0.6rem] flex gap-[0.3rem]" aria-hidden="true">
                              {Array.from({ length: crop.stageCount }, (_, index) => (
                                <span
                                  key={index}
                                  className={`h-[0.4rem] flex-1 rounded-full ${index < (crop.stageNumber ?? 0) ? 'bg-primary' : 'bg-border'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                        <p className="mt-[0.85rem] text-[0.875rem] text-muted">
                          {t('app.home.crops.planted')} {formatDay(crop.plantedOn, language)}
                        </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel
              id="next-title"
              title={t('app.home.next.title')}
              action={<TextLink to={ROUTES.pages.app.calendar}>{t('calendar.open')}</TextLink>}
            >
              {upcoming.length === 0 ? (
                <EmptyState icon={CalendarDays} body={t('app.home.next.empty')} />
              ) : (
                <ul className="grid list-none gap-[0.5rem] p-0">
                  {upcoming.map((item) => {
                    const soon = daysFromToday(item.dueOn) <= 1;
                    return (
                      <li key={item.id} className="flex items-center justify-between gap-[1rem] rounded-[0.85rem] bg-bg px-[1rem] py-[0.8rem]">
                        <div className="min-w-0">
                          <p className="font-medium">{calendarLabel(item.task, t, isMessageKey)}</p>
                          <p className="text-[0.875rem] text-muted">
                            {cropName(item, t)}, {item.plotName}
                          </p>
                        </div>
                        {/* Due today or tomorrow is set apart with a filled chip; later dates stay quiet. */}
                        <span
                          className={[
                            'shrink-0 rounded-full px-[0.75em] py-[0.25em] text-[0.875rem] font-medium tabular-nums',
                            soon ? 'bg-primary text-on-primary' : 'text-muted',
                          ].join(' ')}
                        >
                          {dueLabel(item.dueOn)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          <Panel id="recent-title" title={t('app.home.activity.title')}>
            {recent.length === 0 ? (
              <EmptyState icon={ClipboardList} body={t('app.home.activity.empty')} />
            ) : (
              <ul className="grid list-none gap-[0.5rem] p-0 lg:grid-cols-2">
                {recent.map((entry) => (
                  <li key={entry.id} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-[1rem] rounded-[0.85rem] bg-bg px-[1rem] py-[0.8rem]">
                    <span className="text-[0.875rem] tabular-nums text-muted">{formatDay(entry.doneOn, language)}</span>
                    <div className="min-w-0">
                      <p className="font-medium">{t(ACTIVITY_LABELS[entry.kind])}</p>
                      <p className="text-[0.875rem] text-muted">
                        {cropName(entry, t)}, {entry.plotName}
                      </p>
                    </div>
                    <span className={`text-right tabular-nums ${entry.costKes === null ? 'text-[0.875rem] text-muted' : 'font-semibold'}`}>
                      {entry.costKes === null ? t('app.home.activity.noCost') : formatKes(entry.costKes, language)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}

      {/* Coming later: a picture and a few words, not a paragraph. */}
      <section
        aria-labelledby="health-title"
        className="flex flex-wrap items-center gap-[clamp(1rem,3vw,2rem)] rounded-[1.25rem] bg-surface p-[clamp(1rem,2.5vw,1.75rem)]"
      >
        <div className="rounded-[1rem] bg-bg p-[0.75rem]">
          <CropHealthIllustration className="h-auto w-[clamp(5rem,12vw,7.5rem)]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="health-title" className="text-[1.25rem] font-semibold leading-[1.2]">
            {t('app.home.health.title')}
          </h2>
          <p className="mt-[0.4rem] inline-flex items-center gap-[0.45em] text-muted">
            <ScanSearch className="size-[1.15em] shrink-0" aria-hidden="true" />
            {t('app.home.health.later')}
          </p>
        </div>
      </section>
    </>
  );
}
