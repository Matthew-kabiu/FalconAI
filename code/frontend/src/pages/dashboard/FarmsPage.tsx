// Farms: the farmer's farms as picture cards, 20 per page (DESIGN.md → Product
// surfaces). Each card opens the farm. With no farms yet, the screen is one picture
// and one button. The Farms tutorial opens the first time.
import { ArrowLeft, ArrowRight, ChevronRight, CircleAlert, CircleHelp, LandPlot, Plus, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { Tutorial } from '@/components/app/Tutorial';
import { NameFarmIllustration } from '@/components/app/TutorialIllustrations';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { useFarms } from '@/hooks/use-farms';
import { useLanguage } from '@/hooks/use-language';
import { useTutorial } from '@/hooks/use-tutorial';
import { countyName } from '@/lib/counties';
import { ROUTES } from '@/lib/routes';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export default function FarmsPage() {
  const { t } = useLanguage();
  const guide = useTutorial('farms');
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { state, reload } = useFarms(page);
  const goTo = (next: number) => setParams(next === 1 ? {} : { page: String(next) });

  const hasFarms = state.kind === 'ok' && state.data.meta.total > 0;

  return (
    <div className="grid gap-[clamp(1.25rem,3vw,2rem)]">
      <PageHeader
        title={t('app.farms.title')}
        lead={t('app.farms.lead')}
        actions={
          <>
            <Button icon={CircleHelp} variant="secondary" className="min-h-[3rem]" onClick={guide.show}>
              {t('app.tutorial.show')}
            </Button>
            {hasFarms && (
              <ButtonLink to={ROUTES.pages.app.farmNew} icon={Plus}>
                {t('app.farms.add')}
              </ButtonLink>
            )}
          </>
        }
      />

      {state.kind === 'loading' && <LoadingState />}

      {state.kind === 'error' && (
        <div className="rounded-[1rem] bg-surface p-[1.5rem]" role="alert">
          <p className="flex items-start gap-[0.6em] text-danger">
            <CircleAlert className="mt-[0.15em] size-[1.25em] shrink-0" aria-hidden="true" />
            {t(state.message)}
          </p>
          <Button className="mt-[1rem] min-h-[3rem] w-full sm:w-auto" icon={RefreshCw} onClick={reload}>
            {t('common.tryAgain')}
          </Button>
        </div>
      )}

      {/* No farms yet: one picture, one button. */}
      {state.kind === 'ok' && !hasFarms && (
        <section
          aria-labelledby="farms-empty-title"
          className="grid items-center gap-[clamp(1.25rem,3vw,2.5rem)] rounded-[1.25rem] bg-leaf-soft p-[clamp(1.25rem,4vw,3rem)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
        >
          <div className="flex justify-center rounded-[1rem] bg-bg/40 p-[clamp(1rem,3vw,2rem)]">
            <NameFarmIllustration className="h-auto w-[min(100%,18rem)]" />
          </div>
          <div>
            <h2 id="farms-empty-title" className="text-[clamp(1.5rem,1.2rem+1.4vw,2.125rem)] font-semibold leading-[1.15] tracking-tight">
              {t('app.farms.empty.title')}
            </h2>
            <p className="mt-[0.5em] text-[1.0625rem] leading-relaxed">{t('app.farms.empty.body')}</p>
            <ButtonLink to={ROUTES.pages.app.farmNew} icon={Plus} className="mt-[1.5rem] w-full sm:w-auto">
              {t('app.farms.add')}
            </ButtonLink>
          </div>
        </section>
      )}

      {state.kind === 'ok' && hasFarms && (
        <>
          <ul className="grid list-none gap-[clamp(0.75rem,1.5vw,1rem)] p-0 sm:grid-cols-2 xl:grid-cols-3">
            {state.data.items.map((farm) => (
              <li key={farm.id}>
                <Link
                  to={ROUTES.pages.app.farm(farm.id)}
                  className={`group flex h-full items-center gap-[1rem] rounded-[1.25rem] bg-surface p-[clamp(1rem,2vw,1.4rem)] transition-colors hover:bg-surface-hover ${FOCUS}`}
                >
                  <span className="flex size-[3.5rem] shrink-0 items-center justify-center rounded-[1rem] bg-leaf-soft">
                    <LandPlot className="size-[1.75rem] text-primary" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[1.125rem] font-semibold leading-tight">{farm.name}</span>
                    <span className="mt-[0.2em] block truncate text-muted">
                      {countyName(farm.county)}
                      {farm.locality ? `, ${farm.locality}` : ''}
                    </span>
                    <span className="mt-[0.5rem] inline-flex rounded-full bg-bg px-[0.7em] py-[0.15em] text-[0.875rem] font-medium tabular-nums text-muted">
                      {farm.plotCount} {t(farm.plotCount === 1 ? 'farms.plot' : 'farms.plots')}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-[1.4rem] shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-[0.2em]"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>

          {/* Pages only when there are more than 20 farms. */}
          {state.data.meta.total > state.data.meta.perPage && (
            <nav aria-label={t('farms.pages')} className="flex items-center justify-between gap-[1rem]">
              <Button icon={ArrowLeft} variant="secondary" disabled={page <= 1} onClick={() => goTo(page - 1)}>
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
                onClick={() => goTo(page + 1)}
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
