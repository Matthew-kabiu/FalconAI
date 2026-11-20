// First-run guide on Home: three picture cards, in order. Only the step to do now is
// tinted and tappable, so there is exactly one obvious next tap. Words are kept to a
// short title and one line; the drawing carries the meaning.
import type { ComponentType } from 'react';
import { ArrowRight, CircleCheck, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n';

export interface StartStep {
  title: MessageKey;
  body: MessageKey;
  Art: ComponentType<{ className?: string }>;
  /** Where the step is done. */
  to: string;
  done: boolean;
}

export function StartSteps({ steps }: { steps: readonly StartStep[] }) {
  const { t } = useLanguage();
  const current = steps.findIndex((step) => !step.done);
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <section aria-labelledby="start-title">
      <div className="flex flex-wrap items-center justify-between gap-[1rem]">
        <h2 id="start-title" className="text-[clamp(1.375rem,1.1rem+1vw,1.75rem)] font-semibold leading-[1.2] tracking-tight">
          {t('app.home.start.title')}
        </h2>
        {/* Progress as shapes, with the count in words for screen readers. */}
        <p className="flex items-center gap-[0.4rem]">
          <span className="sr-only">
            {doneCount} / {steps.length} {t('app.home.setup.stepsDone')}
          </span>
          {steps.map((step, index) => (
            <span
              key={step.title}
              aria-hidden="true"
              className={`h-[0.5rem] rounded-full transition-all duration-200 ${
                step.done ? 'w-[1.25rem] bg-primary' : index === current ? 'w-[2.25rem] bg-primary' : 'w-[1.25rem] bg-border'
              }`}
            />
          ))}
        </p>
      </div>

      <ol className="mt-[1.25rem] grid list-none gap-[clamp(0.75rem,1.5vw,1.25rem)] p-0 md:grid-cols-3">
        {steps.map(({ title, body, Art, to, done }, index) => {
          const now = index === current;
          const inner = (
            <>
              <div className={`flex items-center justify-center rounded-[1rem] p-[clamp(0.75rem,2vw,1.5rem)] ${now ? 'bg-bg/40' : 'bg-bg'}`}>
                <Art className={`h-auto w-[min(100%,13rem)] ${now || done ? '' : 'opacity-50'}`} />
              </div>
              <div className="mt-[1.1rem] flex items-start gap-[0.85rem]">
                <span
                  aria-hidden="true"
                  className={`flex size-[2.25rem] shrink-0 items-center justify-center rounded-full text-[1.0625rem] font-semibold tabular-nums ${
                    now ? 'bg-primary text-on-primary' : 'bg-bg text-muted'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[1.25rem] font-semibold leading-[1.2]">{t(title)}</h3>
                  <p className="mt-[0.25em] text-muted">{t(body)}</p>
                </div>
              </div>
              <p
                className={[
                  'mt-[1.25rem] inline-flex min-h-[3rem] w-full items-center justify-center gap-[0.5em] rounded-[0.6em] font-medium',
                  now ? 'bg-primary text-on-primary transition-colors group-hover:bg-primary-hover' : 'bg-bg text-muted',
                ].join(' ')}
              >
                {done ? (
                  <>
                    <CircleCheck className="size-[1.2em] text-success" aria-hidden="true" />
                    {t('app.home.step.done')}
                  </>
                ) : now ? (
                  <>
                    {t('app.home.step.now')}
                    <ArrowRight className="size-[1.15em] transition-transform duration-200 group-hover:translate-x-[0.2em]" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <Lock className="size-[1.1em]" aria-hidden="true" />
                    {t('app.home.step.later')}
                  </>
                )}
              </p>
            </>
          );
          const shell = `flex h-full flex-col rounded-[1.25rem] p-[clamp(1rem,2vw,1.5rem)] ${now ? 'bg-leaf-soft' : 'bg-surface'}`;

          return (
            <li key={title} aria-current={now ? 'step' : undefined}>
              {now ? (
                <Link
                  to={to}
                  className={`group ${shell} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
                >
                  {inner}
                </Link>
              ) : (
                <div className={shell}>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
