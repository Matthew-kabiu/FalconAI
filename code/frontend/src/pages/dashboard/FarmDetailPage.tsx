// One farm and its plots. The most important action here is adding a plot, so it is
// the one filled button. Plots are rows with edit and delete; deleting always asks
// first. A farm with plots cannot be deleted; the screen says why instead of failing.
import { useState } from 'react';
import { ArrowLeft, CircleAlert, MapPin, Pencil, Plus, RefreshCw, Sprout, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { AddPlotIllustration } from '@/components/app/TutorialIllustrations';
import { LoadingState } from '@/components/feedback/LoadingState';
import { notify } from '@/components/feedback/toast';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { APP_TOOLTIP_ID } from '@/components/ui/AppTooltip';
import { useOpenCycles } from '@/hooks/use-crops';
import { useFarm } from '@/hooks/use-farm';
import { useLanguage } from '@/hooks/use-language';
import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import { countyName } from '@/lib/counties';
import { cropIcon, cropName } from '@/lib/crops';
import type { MessageKey } from '@/lib/i18n';
import { formatPlotSize } from '@/lib/plot-size';
import { ROUTES } from '@/lib/routes';
import type { Plot } from '@/types/farm';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const ROW_ACTION = `inline-flex min-h-[2.75rem] min-w-[2.75rem] cursor-pointer items-center justify-center rounded-[0.6rem] text-muted transition-colors hover:bg-surface-hover hover:text-fg ${FOCUS}`;

type Deleting = { kind: 'plot'; plot: Plot } | { kind: 'farm' } | null;

export default function FarmDetailPage() {
  const { farmId = '' } = useParams();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { state, reload } = useFarm(farmId);
  // What is growing on each plot now (one request for all plots).
  const openCycles = useOpenCycles();
  const [deleting, setDeleting] = useState<Deleting>(null);
  const [pending, setPending] = useState(false);
  const [deleteError, setDeleteError] = useState<MessageKey | null>(null);

  const back = (
    <Link
      to={ROUTES.pages.app.farms}
      className={`inline-flex min-h-[2.75rem] w-fit items-center gap-[0.45em] rounded-[0.5rem] font-medium text-muted transition-colors hover:text-fg ${FOCUS}`}
    >
      <ArrowLeft className="size-[1.15em]" aria-hidden="true" />
      {t('farms.allFarms')}
    </Link>
  );

  if (state.kind === 'loading') return <LoadingState />;

  if (state.kind === 'notFound') {
    return (
      <div className="grid gap-[1rem]">
        {back}
        <div className="rounded-[1.25rem] bg-surface p-[clamp(1.25rem,3vw,2rem)]">
          <h1 className="text-[1.5rem] font-semibold">{t('farms.notFound.title')}</h1>
          <p className="mt-[0.4em] text-muted">{t('farms.notFound.body')}</p>
        </div>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="grid gap-[1rem]">
        {back}
        <div className="rounded-[1rem] bg-surface p-[1.5rem]" role="alert">
          <p className="flex items-start gap-[0.6em] text-danger">
            <CircleAlert className="mt-[0.15em] size-[1.25em] shrink-0" aria-hidden="true" />
            {t(state.message)}
          </p>
          <Button className="mt-[1rem] min-h-[3rem] w-full sm:w-auto" icon={RefreshCw} onClick={reload}>
            {t('common.tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  const farm = state.data;
  const growing = new Map(
    openCycles.state.kind === 'ok' ? openCycles.state.data.items.map((cycle) => [cycle.plotId, cycle] as const) : [],
  );
  const hasPlots = farm.plots.length > 0;

  const closeDialog = () => {
    if (pending) return;
    setDeleting(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setPending(true);
    setDeleteError(null);
    try {
      if (deleting.kind === 'plot') {
        await apiClient.plots.remove(deleting.plot.id);
        notify.success(t('plots.deleted'));
        setDeleting(null);
        reload();
        document.getElementById('plots-title')?.focus();
      } else {
        await apiClient.farms.remove(farm.id);
        notify.success(t('farms.deleted'));
        navigate(ROUTES.pages.app.farms, { replace: true });
      }
    } catch (err) {
      setDeleteError(err instanceof ApiClientError ? err.userMessage : 'error.generic');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid gap-[clamp(1.25rem,3vw,2rem)]">
      {back}
      <PageHeader
        title={farm.name}
        lead={`${countyName(farm.county)}${farm.locality ? `, ${farm.locality}` : ''}`}
        actions={
          <ButtonLink to={ROUTES.pages.app.farmEdit(farm.id)} icon={Pencil} variant="secondary">
            {t('farms.edit')}
          </ButtonLink>
        }
      />

      {hasPlots ? (
        <section aria-labelledby="plots-title" className="rounded-[1.25rem] bg-surface p-[clamp(1.1rem,2.5vw,1.75rem)]">
          <div className="flex flex-wrap items-center justify-between gap-[1rem]">
            {/* tabIndex lets focus land here after a plot is deleted (its row is gone). */}
            <h2 id="plots-title" tabIndex={-1} className="text-[1.25rem] font-semibold focus-visible:outline-none">
              {t('farms.plotsTitle')}
            </h2>
            <ButtonLink to={ROUTES.pages.app.plotNew(farm.id)} icon={Plus}>
              {t('plots.add')}
            </ButtonLink>
          </div>
          <ul className="mt-[1rem] grid list-none gap-[0.6rem] p-0 lg:grid-cols-2">
            {farm.plots.map((plot) => (
              <li key={plot.id} className="flex items-center gap-[0.9rem] rounded-[1rem] bg-bg p-[0.9rem]">
                <span className="flex size-[3rem] shrink-0 items-center justify-center rounded-[0.85rem] bg-leaf-soft">
                  <Sprout className="size-[1.5rem] text-primary" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{plot.name}</p>
                  <p className="tabular-nums text-muted">{formatPlotSize(plot.size, plot.sizeUnit, language, t)}</p>
                  {plot.notes && <p className="mt-[0.2em] line-clamp-2 text-[0.875rem] text-muted">{plot.notes}</p>}
                  {/* The plot's crop now, or the next step: start one. */}
                  {(() => {
                    const cycle = growing.get(plot.id);
                    if (cycle) {
                      const CropIcon = cropIcon(cycle.crop);
                      return (
                        <Link
                          to={ROUTES.pages.app.crop(cycle.id)}
                          className={`mt-[0.5rem] inline-flex min-h-[2.75rem] items-center gap-[0.45em] rounded-[0.6rem] font-medium text-primary hover:text-primary-hover ${FOCUS}`}
                        >
                          <CropIcon className="size-[1.15em]" aria-hidden="true" />
                          {cropName(cycle, t)}
                        </Link>
                      );
                    }
                    return openCycles.state.kind === 'ok' ? (
                      <Link
                        to={ROUTES.pages.app.cropNew(farm.id, plot.id)}
                        className={`mt-[0.5rem] inline-flex min-h-[2.75rem] items-center gap-[0.45em] rounded-[0.6rem] font-medium text-primary hover:text-primary-hover ${FOCUS}`}
                      >
                        <Plus className="size-[1.15em]" aria-hidden="true" />
                        {t('cycle.start')}
                      </Link>
                    ) : null;
                  })()}
                </div>
                <Link
                  to={ROUTES.pages.app.plotEdit(farm.id, plot.id)}
                  aria-label={`${t('plots.edit')}: ${plot.name}`}
                  data-tooltip-id={APP_TOOLTIP_ID}
                  data-tooltip-content={t('plots.edit')}
                  className={ROW_ACTION}
                >
                  <Pencil className="size-[1.2rem]" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  aria-label={`${t('plots.delete')}: ${plot.name}`}
                  data-tooltip-id={APP_TOOLTIP_ID}
                  data-tooltip-content={t('plots.delete')}
                  onClick={() => setDeleting({ kind: 'plot', plot })}
                  className={`${ROW_ACTION} hover:text-danger`}
                >
                  <Trash2 className="size-[1.2rem]" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        // No plots yet: the next step, as a picture and one button.
        <section
          aria-labelledby="plots-empty-title"
          className="grid items-center gap-[clamp(1.25rem,3vw,2.5rem)] rounded-[1.25rem] bg-leaf-soft p-[clamp(1.25rem,4vw,3rem)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
        >
          <div className="flex justify-center rounded-[1rem] bg-bg/40 p-[clamp(1rem,3vw,2rem)]">
            <AddPlotIllustration className="h-auto w-[min(100%,18rem)]" />
          </div>
          <div>
            <h2 id="plots-empty-title" className="text-[clamp(1.375rem,1.1rem+1.2vw,1.875rem)] font-semibold leading-[1.15] tracking-tight">
              {t('plots.empty.title')}
            </h2>
            <p className="mt-[0.5em] text-[1.0625rem] leading-relaxed">{t('plots.empty.body')}</p>
            <ButtonLink to={ROUTES.pages.app.plotNew(farm.id)} icon={Plus} className="mt-[1.5rem] w-full sm:w-auto">
              {t('plots.add')}
            </ButtonLink>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-x-[1rem] gap-y-[0.25rem]">
        <Button icon={Trash2} variant="ghost" disabled={hasPlots} onClick={() => setDeleting({ kind: 'farm' })} className="hover:text-danger">
          {t('farms.delete')}
        </Button>
        {hasPlots && (
          <p className="inline-flex items-center gap-[0.45em] text-[0.875rem] text-muted">
            <MapPin className="size-[1.1em] shrink-0" aria-hidden="true" />
            {t('farms.deleteBlocked')}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting?.kind === 'plot' ? `${t('plots.deleteTitle')} ${deleting.plot.name}?` : `${t('farms.deleteTitle')} ${farm.name}?`}
        body={t(deleting?.kind === 'plot' ? 'plots.deleteBody' : 'farms.deleteBody')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => void confirmDelete()}
        onCancel={closeDialog}
        pending={pending}
        error={deleteError ? t(deleteError) : undefined}
      />
    </div>
  );
}
