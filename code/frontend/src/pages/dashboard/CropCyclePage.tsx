// One crop on one plot, for the whole season. What matters most is "what did this
// season cost so far", so that is the one tinted figure; the one filled button is
// "Log an activity". Below: the crop calendar when the crop has a sourced one (or a
// plain note that it has none yet), then the activity log, newest first.
import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CircleX,
  ClipboardList,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wheat,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { LoadingState } from '@/components/feedback/LoadingState';
import { notify } from '@/components/feedback/toast';
import { APP_TOOLTIP_ID } from '@/components/ui/AppTooltip';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useActivities, useCropCycle } from '@/hooks/use-crops';
import { useLanguage } from '@/hooks/use-language';
import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import { ACTIVITY_ICONS, ACTIVITY_LABELS, calendarLabel, cropIcon, cropName, STATUS_LABELS, UNIT_LABELS } from '@/lib/crops';
import { formatDay, formatKes } from '@/lib/format';
import { isMessageKey, type MessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';
import type { Activity, CropCalendar, CropCycleDetail, CycleStatus } from '@/types/crop';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const ROW_ACTION = `inline-flex min-h-[2.75rem] min-w-[2.75rem] cursor-pointer items-center justify-center rounded-[0.6rem] text-muted transition-colors hover:bg-surface-hover hover:text-fg ${FOCUS}`;

export default function CropCyclePage() {
  const { cycleId = '' } = useParams();
  const { t } = useLanguage();
  const { state, reload } = useCropCycle(cycleId);

  const back = (
    <Link
      to={ROUTES.pages.app.crops}
      className={`inline-flex min-h-[2.75rem] w-fit items-center gap-[0.45em] rounded-[0.5rem] font-medium text-muted transition-colors hover:text-fg ${FOCUS}`}
    >
      <ArrowLeft className="size-[1.15em]" aria-hidden="true" />
      {t('cycle.allCrops')}
    </Link>
  );

  if (state.kind === 'loading') return <LoadingState />;
  if (state.kind !== 'ok') {
    return (
      <div className="grid gap-[1rem]">
        {back}
        <div className="rounded-[1rem] bg-surface p-[1.5rem]" role="alert">
          <p className="flex items-start gap-[0.6em] text-muted">
            <CircleAlert className="mt-[0.15em] size-[1.25em] shrink-0" aria-hidden="true" />
            {t(state.kind === 'error' ? state.message : 'cycle.notFound')}
          </p>
          {state.kind === 'error' && (
            <Button className="mt-[1rem] min-h-[3rem] w-full sm:w-auto" icon={RefreshCw} onClick={reload}>
              {t('common.tryAgain')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return <Cycle cycle={state.data} reload={reload} back={back} />;
}

function Cycle({ cycle, reload, back }: { cycle: CropCycleDetail; reload: () => void; back: ReactNode }) {
  const { language, t } = useLanguage();
  const [page, setPage] = useState(1);
  const activities = useActivities(cycle.id, page);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const [stopping, setStopping] = useState(false);
  const [pending, setPending] = useState(false);
  const [dialogError, setDialogError] = useState<MessageKey | null>(null);
  const CropIcon = cropIcon(cycle.crop);
  const open = cycle.status === 'planned' || cycle.status === 'active';

  const moveTo = async (status: CycleStatus, message: MessageKey) => {
    setPending(true);
    setDialogError(null);
    try {
      await apiClient.cycles.update(cycle.id, { status });
      notify.success(t(message));
      setStopping(false);
      reload();
    } catch (err) {
      const key = err instanceof ApiClientError ? err.userMessage : 'error.generic';
      if (stopping) setDialogError(key);
      else notify.error(err, t);
    } finally {
      setPending(false);
    }
  };

  const deleteActivity = async () => {
    if (!deleting) return;
    setPending(true);
    setDialogError(null);
    try {
      await apiClient.activities.remove(deleting.id);
      notify.success(t('activity.deleted'));
      setDeleting(null);
      reload();
      activities.reload();
      document.getElementById('activities-title')?.focus();
    } catch (err) {
      setDialogError(err instanceof ApiClientError ? err.userMessage : 'error.generic');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid gap-[clamp(1.25rem,3vw,2rem)]">
      {back}
      <PageHeader
        title={cropName(cycle, t)}
        lead={`${cycle.plotName}, ${cycle.farmName}`}
        actions={
          <>
            <ButtonLink to={ROUTES.pages.app.cropEdit(cycle.id)} icon={Pencil} variant="secondary">
              {t('cycle.edit')}
            </ButtonLink>
            {open && (
              <ButtonLink to={ROUTES.pages.app.activityNew(cycle.id)} icon={Plus}>
                {t('activity.add')}
              </ButtonLink>
            )}
          </>
        }
      />

      {/* At a glance: status, planting date, and the one figure that matters most. */}
      <dl className="grid gap-[clamp(0.75rem,1.5vw,1rem)] sm:grid-cols-3">
        <div className="rounded-[1rem] bg-surface p-[clamp(1rem,2.2vw,1.5rem)]">
          <dt className="flex items-center gap-[0.5em] text-[0.9375rem] text-muted">
            <CropIcon className="size-[1.2em] text-primary" aria-hidden="true" />
            {t('cycle.field.status')}
          </dt>
          <dd className="mt-[0.35rem] text-[1.375rem] font-semibold leading-tight">{t(STATUS_LABELS[cycle.status])}</dd>
          {cycle.variety && <dd className="mt-[0.2rem] text-muted">{cycle.variety}</dd>}
        </div>
        <div className="rounded-[1rem] bg-surface p-[clamp(1rem,2.2vw,1.5rem)]">
          <dt className="flex items-center gap-[0.5em] text-[0.9375rem] text-muted">
            <CalendarDays className="size-[1.2em] text-primary" aria-hidden="true" />
            {t('cycle.field.plantedOn')}
          </dt>
          <dd className="mt-[0.35rem] text-[1.375rem] font-semibold leading-tight tabular-nums">{formatDay(cycle.plantedOn, language)}</dd>
        </div>
        <div className="rounded-[1rem] bg-leaf-soft p-[clamp(1rem,2.2vw,1.5rem)]">
          <dt className="flex items-center gap-[0.5em] text-[0.9375rem]">
            <Banknote className="size-[1.2em] text-primary" aria-hidden="true" />
            {t('cycle.seasonCost')}
          </dt>
          <dd className="mt-[0.35rem] text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] font-semibold leading-[1.1] tabular-nums">
            {formatKes(cycle.seasonCostKes, language)}
          </dd>
          <dd className="mt-[0.2rem] text-[0.875rem] tabular-nums">
            {cycle.activityCount} {t(cycle.activityCount === 1 ? 'cycle.activity' : 'cycle.activities')}
          </dd>
        </div>
      </dl>

      <Calendar calendar={cycle.calendar} />

      <section aria-labelledby="activities-title" className="rounded-[1.25rem] bg-surface p-[clamp(1.1rem,2.5vw,1.75rem)]">
        <h2 id="activities-title" tabIndex={-1} className="text-[1.25rem] font-semibold focus-visible:outline-none">
          {t('cycle.activitiesTitle')}
        </h2>
        {activities.state.kind === 'loading' && <LoadingState />}
        {activities.state.kind === 'error' && <p className="mt-[0.75rem] text-danger">{t(activities.state.message)}</p>}
        {activities.state.kind === 'ok' && activities.state.data.items.length === 0 && (
          <p className="mt-[0.75rem] flex items-start gap-[0.7em] text-muted">
            <ClipboardList className="mt-[0.1em] size-[1.3em] shrink-0" aria-hidden="true" />
            {t(open ? 'cycle.noActivities' : 'cycle.noActivitiesClosed')}
          </p>
        )}
        {activities.state.kind === 'ok' && activities.state.data.items.length > 0 && (
          <>
            <ul className="mt-[1rem] grid list-none gap-[0.5rem] p-0">
              {activities.state.data.items.map((activity) => {
                const Icon = ACTIVITY_ICONS[activity.kind];
                const detail = [
                  activity.input,
                  activity.quantity !== null && activity.quantityUnit
                    ? `${activity.quantity} ${t(UNIT_LABELS[activity.quantityUnit])}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(', ');
                return (
                  <li key={activity.id} className="flex items-center gap-[0.85rem] rounded-[1rem] bg-bg p-[0.85rem]">
                    <span className="flex size-[2.75rem] shrink-0 items-center justify-center rounded-[0.75rem] bg-leaf-soft">
                      <Icon className="size-[1.35rem] text-primary" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{t(ACTIVITY_LABELS[activity.kind])}</p>
                      <p className="text-[0.875rem] tabular-nums text-muted">
                        {formatDay(activity.doneOn, language)}
                        {detail ? `, ${detail}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 text-right tabular-nums ${activity.costKes === null ? 'text-[0.875rem] text-muted' : 'font-semibold'}`}>
                      {activity.costKes === null ? t('app.home.activity.noCost') : formatKes(activity.costKes, language)}
                    </span>
                    {open && (
                      <>
                        <Link
                          to={ROUTES.pages.app.activityEdit(cycle.id, activity.id)}
                          aria-label={t('activity.edit')}
                          data-tooltip-id={APP_TOOLTIP_ID}
                          data-tooltip-content={t('activity.edit')}
                          className={ROW_ACTION}
                        >
                          <Pencil className="size-[1.15rem]" aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          aria-label={t('activity.delete')}
                          data-tooltip-id={APP_TOOLTIP_ID}
                          data-tooltip-content={t('activity.delete')}
                          onClick={() => setDeleting(activity)}
                          className={`${ROW_ACTION} hover:text-danger`}
                        >
                          <Trash2 className="size-[1.15rem]" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
            {activities.state.data.meta.total > activities.state.data.meta.perPage && (
              <nav aria-label={t('farms.pages')} className="mt-[1rem] flex items-center justify-between gap-[1rem]">
                <Button icon={ArrowLeft} variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  {t('farms.previous')}
                </Button>
                <span className="tabular-nums text-muted">
                  {page} / {Math.ceil(activities.state.data.meta.total / activities.state.data.meta.perPage)}
                </span>
                <Button
                  icon={ArrowRight}
                  iconPosition="right"
                  variant="secondary"
                  disabled={page * activities.state.data.meta.perPage >= activities.state.data.meta.total}
                  onClick={() => setPage(page + 1)}
                >
                  {t('farms.next')}
                </Button>
              </nav>
            )}
          </>
        )}
      </section>

      {/* Moving the season on: planted → growing → harvested, or stopped. */}
      {open && (
        <div className="flex flex-wrap items-center gap-[0.75rem]">
          {cycle.status === 'planned' && (
            <Button icon={CircleCheck} variant="secondary" loading={pending && !stopping} onClick={() => void moveTo('active', 'cycle.nowGrowing')}>
              {t('cycle.markPlanted')}
            </Button>
          )}
          {cycle.status === 'active' && (
            <Button icon={Wheat} variant="secondary" loading={pending && !stopping} onClick={() => void moveTo('harvested', 'cycle.harvestedDone')}>
              {t('cycle.markHarvested')}
            </Button>
          )}
          <Button icon={CircleX} variant="ghost" onClick={() => setStopping(true)} className="hover:text-danger">
            {t('cycle.stop')}
          </Button>
        </div>
      )}
      {!open && (
        <ButtonLink to={ROUTES.pages.app.farm(cycle.farmId)} icon={ArrowRight} variant="secondary" className="w-fit">
          {t('cycle.toPlot')}
        </ButtonLink>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t('activity.deleteTitle')}
        body={t('activity.deleteBody')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => void deleteActivity()}
        onCancel={() => !pending && (setDeleting(null), setDialogError(null))}
        pending={pending}
        error={dialogError ? t(dialogError) : undefined}
      />
      <ConfirmDialog
        open={stopping}
        title={`${t('cycle.stopTitle')} ${cropName(cycle, t)}?`}
        body={t('cycle.stopBody')}
        confirmLabel={t('cycle.stop')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => void moveTo('abandoned', 'cycle.stopped')}
        onCancel={() => !pending && (setStopping(false), setDialogError(null))}
        pending={pending}
        error={dialogError ? t(dialogError) : undefined}
      />
    </div>
  );
}

/** The growth stages as a vertical timeline, the current one marked; or why there is none. */
function Calendar({ calendar }: { calendar: CropCalendar | null }) {
  const { language, t } = useLanguage();

  if (!calendar) {
    return (
      <section aria-labelledby="calendar-title" className="flex items-start gap-[0.9em] rounded-[1.25rem] bg-surface p-[clamp(1.1rem,2.5vw,1.75rem)]">
        <Info className="mt-[0.15em] size-[1.4em] shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 id="calendar-title" className="font-semibold">
            {t('cycle.calendarTitle')}
          </h2>
          <p className="mt-[0.25em] text-muted">{t('cycle.noCalendar')}</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="calendar-title" className="rounded-[1.25rem] bg-surface p-[clamp(1.1rem,2.5vw,1.75rem)]">
      <h2 id="calendar-title" className="text-[1.25rem] font-semibold">
        {t('cycle.calendarTitle')}
      </h2>
      <ol className="mt-[1rem] list-none p-0">
        {calendar.stages.map((stage, index) => {
          const current = stage.key === calendar.currentStage;
          return (
            <li key={stage.key} aria-current={current ? 'step' : undefined} className="relative grid grid-cols-[1.5rem_1fr] gap-[0.9rem] pb-[1rem] last:pb-0">
              {index < calendar.stages.length - 1 && <span className="absolute bottom-0 left-[0.69rem] top-[1.5rem] w-px bg-border" aria-hidden="true" />}
              <span
                className={`relative mt-[0.15rem] size-[1.4rem] rounded-full ${current ? 'bg-primary' : 'border-2 border-border bg-surface'}`}
                aria-hidden="true"
              />
              <div className={current ? 'rounded-[0.85rem] bg-leaf-soft px-[0.85rem] py-[0.6rem]' : ''}>
                <p className={current ? 'font-semibold' : 'font-medium'}>
                  {calendarLabel(stage.key, t, isMessageKey)}
                  {current && <span className="ml-[0.5em] text-[0.875rem] font-medium text-primary">{t('cycle.now')}</span>}
                </p>
                <p className="text-[0.875rem] tabular-nums text-muted">
                  {formatDay(stage.startsOn, language)} – {formatDay(stage.endsOn, language)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-[1rem] flex items-start gap-[0.5em] text-[0.875rem] text-muted">
        <Info className="mt-[0.1em] size-[1.1em] shrink-0" aria-hidden="true" />
        {t(calendar.reviewed ? 'cycle.calendarSource' : 'cycle.calendarUnreviewed')} {calendar.source}
      </p>
    </section>
  );
}
