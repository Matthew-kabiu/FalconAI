// Pilot page: the 2027 plan from the grant proposal, stated as a plan. It says what
// will be measured and, just as clearly, what the pilot cannot show.
import { ChevronDown, CircleHelp, Info, Scale } from 'lucide-react';
import { CtaBand } from '@/components/marketing/CtaBand';
import { CARD, FOCUS, H2, H3, SECTION, WRAP } from '@/components/marketing/layout';
import { PageHero } from '@/components/marketing/PageHero';
import { Callout } from '@/components/marketing/Callout';
import { Photo } from '@/components/marketing/Photo';
import { PHOTOS } from '@/components/marketing/photos';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n/en';
import { ROUTES } from '@/lib/routes';

const TIMELINE: readonly { month: MessageKey; title: MessageKey; body: MessageKey }[] = [
  { month: 'site.pilot.timeline.feb.month', title: 'site.pilot.timeline.feb.title', body: 'site.pilot.timeline.feb.body' },
  { month: 'site.pilot.timeline.mar.month', title: 'site.pilot.timeline.mar.title', body: 'site.pilot.timeline.mar.body' },
  { month: 'site.pilot.timeline.apr.month', title: 'site.pilot.timeline.apr.title', body: 'site.pilot.timeline.apr.body' },
];

const MEASURES: readonly MessageKey[] = [
  'site.pilot.measure.tasks',
  'site.pilot.measure.clear',
  'site.pilot.measure.abstain',
  'site.pilot.measure.compare',
];

const FAQ: readonly { q: MessageKey; a: MessageKey }[] = [
  { q: 'site.pilot.faq.crops.q', a: 'site.pilot.faq.crops.a' },
  { q: 'site.pilot.faq.internet.q', a: 'site.pilot.faq.internet.a' },
  { q: 'site.pilot.faq.language.q', a: 'site.pilot.faq.language.a' },
  { q: 'site.pilot.faq.privacy.q', a: 'site.pilot.faq.privacy.a' },
  { q: 'site.pilot.faq.advice.q', a: 'site.pilot.faq.advice.a' },
];

export default function PilotPage() {
  const { t } = useLanguage();

  return (
    <>
      <PageHero
        title={t('site.pilot.hero.title')}
        lead={t('site.pilot.hero.lead')}
        aside={
          <Photo
            source={PHOTOS.weeding}
            alt={t('site.pilot.hero.photoAlt')}
            sizes="(min-width: 48rem) 44vw, 100vw"
            priority
            className="aspect-[4/3] rounded-[1.25rem] object-[55%_40%]"
          />
        }
      >
        <Callout icon={Info}>{t('site.pilot.hero.notice')}</Callout>
      </PageHero>

      {/* Timeline: three months on one line, so the order is read before the detail. */}
      <section className={`${WRAP} ${SECTION}`}>
        <SectionHeader title={t('site.pilot.timeline.title')} />
        <ol className="mt-[2rem] grid list-none gap-[1rem] p-0 md:grid-cols-3 md:gap-0">
          {TIMELINE.map(({ month, title, body }, index) => (
            <li key={month} className="reveal relative md:pr-[2rem]">
              <div className="flex items-center gap-[0.75rem]">
                <span
                  className="flex size-[2.75rem] shrink-0 items-center justify-center rounded-full bg-primary text-[1.0625rem] font-semibold tabular-nums text-on-primary"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="hidden h-px flex-1 bg-border md:block" aria-hidden="true" />
              </div>
              <p className="mt-[1rem] text-[0.9375rem] font-semibold text-primary">{t(month)} 2027</p>
              <h3 className={`mt-[0.2em] ${H3}`}>{t(title)}</h3>
              <p className="mt-[0.4em] leading-relaxed text-muted">{t(body)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* What is measured, beside what is not claimed: the two belong together. */}
      <section className="bg-surface">
        <div className={`${WRAP} ${SECTION} grid gap-[1rem] md:grid-cols-[1.2fr_1fr]`}>
          <div className={`reveal bg-bg p-[clamp(1.25rem,4vw,2rem)] ${CARD}`}>
            <h2 className={H2}>{t('site.pilot.measure.title')}</h2>
            <ul className="mt-[1.5rem] grid list-none gap-[1rem] p-0">
              {MEASURES.map((measure) => (
                <li key={measure} className="flex items-start gap-[0.75em]">
                  <CircleHelp className="mt-[0.1em] size-[1.4em] shrink-0 text-primary" aria-hidden="true" />
                  <span className="leading-relaxed">{t(measure)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal rounded-[1rem] bg-leaf-soft p-[clamp(1.25rem,4vw,2rem)]">
            <Scale className="size-[2rem] text-primary" aria-hidden="true" />
            <h2 className="mt-[1rem] text-[1.375rem] font-semibold leading-[1.2]">{t('site.pilot.limits.title')}</h2>
            <p className="mt-[0.6em] leading-relaxed">{t('site.pilot.limits.body')}</p>
          </div>
        </div>
      </section>

      <section className={`${WRAP} ${SECTION} grid gap-[clamp(1.5rem,4vw,4rem)] md:grid-cols-[minmax(0,20rem)_1fr]`}>
        <SectionHeader title={t('site.pilot.faq.title')} />
        <div className="grid gap-[0.75rem]">
          {FAQ.map(({ q, a }) => (
            <details key={q} className={`group ${CARD}`}>
              <summary
                className={`flex min-h-[3.5rem] cursor-pointer list-none items-center justify-between gap-[1rem] rounded-[1rem] px-[1.25rem] py-[0.75rem] font-semibold transition-colors hover:bg-surface-hover [&::-webkit-details-marker]:hidden ${FOCUS}`}
              >
                {t(q)}
                <ChevronDown
                  className="size-[1.25em] shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="px-[1.25rem] pb-[1.25rem] leading-relaxed text-muted">{t(a)}</p>
            </details>
          ))}
        </div>
      </section>

      <RelatedLinks pages={['features', 'cropHealth']} />
      <CtaBand secondary={{ to: ROUTES.pages.cropHealth, label: 'site.cta.cropHealth' }} />
    </>
  );
}
