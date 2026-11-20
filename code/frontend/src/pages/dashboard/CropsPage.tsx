// Crops: every crop the farmer has started, "Growing" or "Finished" (line-style
// choice, page in the URL). Each card opens the crop. A crop is started from a plot,
// so with nothing growing the screen points there, as a picture and one button.
import { ArrowLeft, ArrowRight, ChevronRight, CircleAlert, CircleHelp, LandPlot, Plus, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { Tutorial } from '@/components/app/Tutorial';
import { ChooseCropIllustration } from '@/components/app/TutorialIllustrations';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { useCropCycles } from '@/hooks/use-crops';
import { useLanguage } from '@/hooks/use-language';
import { useTutorial } from '@/hooks/use-tutorial';
import { cropIcon, cropName, STATUS_LABELS } from '@/lib/crops';
import { formatDay } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export default function CropsPage() {
  const { language, t } = useLanguage();
  const guide = useTutorial('crops');
  const [params, setParams] = useSearchParams();
  const show = params.get('show') === 'finished' ? 'closed' : 'open';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { state, reload } = useCropCycles(show, page);
  const go = (next: { show?: 'open' | 'closed'; page?: number }) => {
    const nextShow = next.show ?? show;
    const nextPage = next.page ?? 1;
    setParams({ ...(nextShow === 'closed' ? { show: 'finished' } : {}), ...(nextPage > 1 ? { page: String(nextPage) } : {}) });
  };

  return (
    <div className="grid gap-[clamp(1.25rem,3vw,2rem)]">
      <PageHeader
        title={t('app.crops.title')}
        lead={t('app.crops.lead')}
        actions={
          <>
            <ButtonLink to={ROUTES.pages.app.cropAdd} icon={Plus}>
              {t('cycle.addCrop')}
            </ButtonLink>
            <Button icon={CircleHelp} variant="secondary" className="min-h-[3rem]" onClick={guide.show}>
              {t('app.tutorial.show')}
            </Button>
          </>
        }
      />

      <ChoiceGroup
        legend={t('cycle.filter')}
        showLegend={false}
        options={[
          { value: 'open', label: t('cycle.filter.growing') },
          { value: 'closed', label: t('cycle.filter.finished') },
        ]}
        value={show}
        onChange={(value) => go({ show: value as 'open' | 'closed' })}
      />

      {state.kind === 'loading' && <LoadingState />}

      {(state.kind === 'error' || state.kind === 'notFound') && (
        <div className="rounded-[1rem] bg-surface p-[1.5rem]" role="alert">
          <p className="flex items-start gap-[0.6em] text-danger">
            <CircleAlert className="mt-[0.15em] size-[1.25em] shrink-0" aria-hidden="true" />
            {t(state.kind === 'error' ? state.message : 'error.generic')}
          </p>
          <Button className="mt-[1rem] min-h-[3rem] w-full sm:w-auto" icon={RefreshCw} onClick={reload}>
            {t('common.tryAgain')}
          </Button>
        </div>
      )}

      {state.kind === 'ok' && state.data.meta.total === 0 && (
        <section
          aria-labelledby="crops-empty-title"
          className="grid items-center gap-[clamp(1.25rem,3vw,2.5rem)] rounded-[1.25rem] bg-leaf-soft p-[clamp(1.25rem,4vw,3rem)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
        >
          <div className="flex justify-center rounded-[1rem] bg-bg/40 p-[clamp(1rem,3vw,2rem)]">
            <ChooseCropIllustration className="h-auto w-[min(100%,18rem)]" />
          </div>
          <div>
            <h2 id="crops-empty-title" className="text-[clamp(1.5rem,1.2rem+1.4vw,2.125rem)] font-semibold leading-[1.15] tracking-tight">
              {t(show === 'open' ? 'cycle.empty.title' : 'cycle.emptyFinished.title')}
            </h2>
            <p className="mt-[0.5em] text-[1.0625rem] leading-relaxed">
              {t(show === 'open' ? 'cycle.empty.body' : 'cycle.emptyFinished.body')}
            </p>
            {show === 'open' && (
              <ButtonLink to={ROUTES.pages.app.farms} icon={LandPlot} className="mt-[1.5rem] w-full sm:w-auto">
                {t('app.crops.toFarms')}
              </ButtonLink>
            )}
          </div>
        </section>
      )}

      {state.kind === 'ok' && state.data.meta.total > 0 && (
        <>
          <ul className="grid list-none gap-[clamp(0.75rem,1.5vw,1rem)] p-0 sm:grid-cols-2 xl:grid-cols-3">
            {state.data.items.map((cycle) => {
              const Icon = cropIcon(cycle.crop);
              return (
                <li key={cycle.id}>
                  <Link
                    to={ROUTES.pages.app.crop(cycle.id)}
                    className={`group flex h-full items-center gap-[1rem] rounded-[1.25rem] bg-surface p-[clamp(1rem,2vw,1.4rem)] transition-colors hover:bg-surface-hover ${FOCUS}`}
                  >
                    <span className="flex size-[3.5rem] shrink-0 items-center justify-center rounded-[1rem] bg-leaf-soft">
                      <Icon className="size-[1.75rem] text-primary" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[1.125rem] font-semibold leading-tight">{cropName(cycle, t)}</span>
                      <span className="mt-[0.2em] block truncate text-muted">
                        {cycle.plotName}, {cycle.farmName}
                      </span>
                      <span className="mt-[0.5rem] flex flex-wrap gap-[0.4rem]">
                        <span className="rounded-full bg-bg px-[0.7em] py-[0.15em] text-[0.875rem] font-medium">{t(STATUS_LABELS[cycle.status])}</span>
                        <span className="rounded-full bg-bg px-[0.7em] py-[0.15em] text-[0.875rem] tabular-nums text-muted">
                          {t('cycle.planted')} {formatDay(cycle.plantedOn, language)}
                        </span>
                      </span>
                    </span>
                    <ChevronRight
                      className="size-[1.4rem] shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-[0.2em]"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          {state.data.meta.total > state.data.meta.perPage && (
            <nav aria-label={t('farms.pages')} className="flex items-center justify-between gap-[1rem]">
              <Button icon={ArrowLeft} variant="secondary" disabled={page <= 1} onClick={() => go({ page: page - 1 })}>
                {t('farms.previous')}
              </Button>
              <span className="tabular-nums text-muted">
                {page} / {Math.ceil(state.data.meta.total / state.data.meta.perPage)}
              </span>
              <Button
                icon={ArrowRight}
                iconPosition="right"
                variant="secondary"
                disabled={page * state.data.meta.perPage >= state.data.meta.total}
                onClick={() => go({ page: page + 1 })}
              >
                {t('farms.next')}
              </Button>
            </nav>
          )}
        </>
      )}

      <Tutorial steps={guide.steps} open={guide.open} onClose={guide.close} />
    </div>
  );
}
