// Features page: the four tools in full, each with its own anchor (#farms, #calendar,
// #costs, #health) so the Home page and the footer can link straight to one.
import { Check, Languages, Lock, Smartphone, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLink } from '@/components/marketing/ArrowLink';
import { CtaBand } from '@/components/marketing/CtaBand';
import { FarmPlotsIllustration } from '@/components/marketing/Illustrations';
import { CARD, FOCUS, H2, H3, LEAD, SECTION, WRAP } from '@/components/marketing/layout';
import { ArtPanel, PageHero } from '@/components/marketing/PageHero';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { StatusChip } from '@/components/marketing/StatusChip';
import { TOOLS } from '@/components/marketing/tools';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n/en';
import { ROUTES } from '@/lib/routes';

const BUILT: readonly { title: MessageKey; body: MessageKey; Icon: LucideIcon }[] = [
  { title: 'site.features.built.phone.title', body: 'site.features.built.phone.body', Icon: Smartphone },
  { title: 'site.features.built.offline.title', body: 'site.features.built.offline.body', Icon: WifiOff },
  { title: 'site.features.built.language.title', body: 'site.features.built.language.body', Icon: Languages },
  { title: 'site.features.built.privacy.title', body: 'site.features.built.privacy.body', Icon: Lock },
];

export default function FeaturesPage() {
  const { t } = useLanguage();

  return (
    <>
      <PageHero
        title={t('site.features.hero.title')}
        lead={t('site.features.hero.lead')}
        aside={
          <ArtPanel>
            <FarmPlotsIllustration className="h-auto w-full max-w-[20rem]" />
          </ArtPanel>
        }
      >
        {/* Jump links: the four tools, one tap each. */}
        <ul className="flex list-none flex-wrap gap-[0.5rem] p-0">
          {TOOLS.map(({ id, title }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className={`inline-flex min-h-[2.75rem] items-center rounded-full border border-border bg-bg px-[1em] font-medium transition-colors hover:border-primary hover:bg-surface-hover ${FOCUS}`}
              >
                {t(title)}
              </a>
            </li>
          ))}
        </ul>
      </PageHero>

      <div className={`${WRAP} ${SECTION} grid gap-[clamp(3rem,9vh,5.5rem)]`}>
        {TOOLS.map(({ id, title, body, points, Art, status }, index) => (
          <section
            key={id}
            id={id}
            aria-labelledby={`${id}-title`}
            className="reveal grid items-center gap-[clamp(1.5rem,5vw,4rem)] md:grid-cols-2"
          >
            <ArtPanel className={index % 2 === 1 ? 'md:order-last' : ''}>
              <Art className="h-auto w-full max-w-[19rem]" />
            </ArtPanel>
            <div className="min-w-0">
              <StatusChip status={status} />
              <h2 id={`${id}-title`} className={`mt-[0.75rem] ${H2}`}>
                {t(title)}
              </h2>
              <p className={`mt-[0.75em] ${LEAD}`}>{t(body)}</p>
              <ul className="mt-[1.25rem] grid list-none gap-[0.7rem] p-0">
                {points.map((point) => (
                  <li key={point} className="flex items-start gap-[0.7em]">
                    <span className="mt-[0.1em] flex size-[1.4em] shrink-0 items-center justify-center rounded-full bg-leaf-soft">
                      <Check className="size-[0.9em] text-primary" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <span className="leading-relaxed">{t(point)}</span>
                  </li>
                ))}
              </ul>
              {id === 'health' && (
                <ArrowLink to={ROUTES.pages.cropHealth} className="mt-[1rem]">
                  {t('site.cta.cropHealth')}
                </ArrowLink>
              )}
            </div>
          </section>
        ))}
      </div>

      <section className="bg-surface">
        <div className={`${WRAP} ${SECTION}`}>
          <SectionHeader title={t('site.features.built.title')} />
          <ul className="mt-[2rem] grid list-none gap-[1rem] p-0 sm:grid-cols-2 lg:grid-cols-4">
            {BUILT.map(({ title, body, Icon }) => (
              <li key={title} className={`reveal bg-bg p-[1.25rem] ${CARD}`}>
                <span className="flex size-[2.75rem] items-center justify-center rounded-[0.75rem] bg-leaf-soft">
                  <Icon className="size-[1.35em] text-primary" aria-hidden="true" />
                </span>
                <h3 className={`mt-[1rem] ${H3}`}>{t(title)}</h3>
                <p className="mt-[0.4em] leading-relaxed text-muted">{t(body)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="pt-[clamp(2.5rem,7vh,4rem)]">
        <RelatedLinks pages={['cropHealth', 'pilot']} />
        <CtaBand secondary={{ to: ROUTES.pages.pilot, label: 'site.cta.pilot' }} />
      </div>
    </>
  );
}
