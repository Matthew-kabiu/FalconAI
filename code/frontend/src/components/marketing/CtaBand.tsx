import { ArrowRight, Sprout } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { WRAP } from '@/components/marketing/layout';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n/en';
import { ROUTES } from '@/lib/routes';

interface CtaBandProps {
  /** A quieter second link, to another page of the site. */
  secondary?: { to: string; label: MessageKey };
}

/** Closing call to action, the same on every page: deep green in both themes. */
export function CtaBand({ secondary }: CtaBandProps) {
  const { t } = useLanguage();

  return (
    <section className={`${WRAP} pb-[clamp(3rem,9vh,6rem)]`}>
      <div className="reveal relative overflow-hidden rounded-[1.25rem] bg-brand-deep px-[clamp(1.5rem,6vw,4rem)] py-[clamp(2.25rem,7vw,4rem)] text-on-brand-deep">
        <Sprout
          className="pointer-events-none absolute -bottom-[12%] -right-[3%] size-[clamp(10rem,28vw,18rem)] text-on-brand-deep opacity-[0.07]"
          strokeWidth={1.25}
          aria-hidden="true"
        />
        <div className="relative grid items-center gap-[1.75rem] md:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <h2 className="text-[clamp(1.625rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.12] tracking-tight text-balance">
              {t('site.band.title')}
            </h2>
            <p className="mt-[0.7em] max-w-[34rem] text-[1.0625rem] leading-relaxed opacity-90">{t('site.band.body')}</p>
          </div>
          <div className="flex flex-col gap-[0.5rem] sm:flex-row sm:items-center md:flex-col md:items-stretch">
            <ButtonLink
              to={ROUTES.pages.auth.signUp}
              icon={ArrowRight}
              variant="accent"
              className="focus-visible:outline-on-brand-deep"
            >
              {t('site.cta.signUp')}
            </ButtonLink>
            {secondary && (
              <Link
                to={secondary.to}
                className="inline-flex min-h-[2.75rem] items-center justify-center rounded-[0.6em] px-[1em] font-medium underline decoration-on-brand-deep/40 underline-offset-[0.25em] transition-colors hover:decoration-on-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-brand-deep"
              >
                {t(secondary.label)}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
