import { CircleAlert, CircleCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/feedback/LoadingState';
import { TextLink } from '@/components/ui/TextLink';
import { useHealth } from '@/hooks/use-health';
import { useLanguage } from '@/hooks/use-language';
import { ROUTES } from '@/lib/routes';

export default function StartPage() {
  const { state, recheck } = useHealth();
  const { t } = useLanguage();
  const checking = state.kind === 'loading';
  // Backend reports "ok" when healthy; show words, never the raw value.
  const statusText = (value: string) => t(value === 'ok' ? 'start.statusOk' : 'start.statusDown');

  return (
    <section className="w-full max-w-[34rem] rounded-[1rem] border border-border bg-surface p-[clamp(1.25rem,6vw,2rem)] shadow-sm">
      <h1 className="text-[clamp(1.5rem,7vw,2.25rem)] font-semibold leading-tight">{t('app.name')}</h1>
      <p className="mt-[0.4em] text-muted">{t('app.tagline')}</p>

      <div className="mt-[1.5em] min-h-[6rem]" aria-live="polite">
        {state.kind === 'loading' && <LoadingState label={t('start.checking')} />}

        {state.kind === 'ok' && (
          <div className="flex items-start gap-[0.75em]">
            <CircleCheck className="mt-[0.15em] size-[1.5em] shrink-0 text-success" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold">{t('start.connected')}</p>
              <dl className="mt-[0.4em] grid grid-cols-[auto_1fr] gap-x-[1em] gap-y-[0.25em] text-muted">
                <dt>{t('start.api')}</dt>
                <dd>{statusText(state.data.status)}</dd>
                <dt>{t('start.database')}</dt>
                <dd>{statusText(state.data.database)}</dd>
              </dl>
            </div>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="flex items-start gap-[0.75em]">
            <CircleAlert className="mt-[0.15em] size-[1.5em] shrink-0 text-danger" aria-hidden="true" />
            <p>{t(state.message)}</p>
          </div>
        )}
      </div>

      <Button className="mt-[1.25em] w-full sm:w-auto" icon={RefreshCw} loading={checking} onClick={recheck}>
        {t('start.checkAgain')}
      </Button>

      <nav aria-label={t('start.accountNav')} className="mt-[1em] flex flex-wrap gap-x-[1.25em]">
        <TextLink to={ROUTES.pages.auth.signIn}>{t('auth.signIn.title')}</TextLink>
        <TextLink to={ROUTES.pages.auth.signUp}>{t('auth.signIn.toSignUp')}</TextLink>
      </nav>
    </section>
  );
}
