// Crop-health page: how a check works and, just as prominent, what it will never do
// (the safety boundary from VISION.md and the grant proposal).
import { Ban, Camera, Info, Lock, MessageSquareText, ScanSearch, UserRoundCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Callout } from '@/components/marketing/Callout';
import { CtaBand } from '@/components/marketing/CtaBand';
import { CropHealthIllustration } from '@/components/marketing/Illustrations';
import { CARD, H3, SECTION, WRAP } from '@/components/marketing/layout';
import { ArtPanel, PageHero } from '@/components/marketing/PageHero';
import { RelatedLinks } from '@/components/marketing/RelatedLinks';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n/en';
import { ROUTES } from '@/lib/routes';

const FLOW: readonly { title: MessageKey; body: MessageKey; Icon: LucideIcon }[] = [
  { title: 'site.health.flow.capture.title', body: 'site.health.flow.capture.body', Icon: Camera },
  { title: 'site.health.flow.check.title', body: 'site.health.flow.check.body', Icon: ScanSearch },
  { title: 'site.health.flow.opinion.title', body: 'site.health.flow.opinion.body', Icon: MessageSquareText },
  { title: 'site.health.flow.expert.title', body: 'site.health.flow.expert.body', Icon: UserRoundCheck },
];

// The first limit (pesticide doses) is the most important, so it gets the full row.
const LIMITS: readonly { title: MessageKey; body: MessageKey }[] = [
  { title: 'site.health.limits.dose.title', body: 'site.health.limits.dose.body' },
  { title: 'site.health.limits.replace.title', body: 'site.health.limits.replace.body' },
  { title: 'site.health.limits.guess.title', body: 'site.health.limits.guess.body' },
  { title: 'site.health.limits.crops.title', body: 'site.health.limits.crops.body' },
];

export default function CropHealthPage() {
  const { t } = useLanguage();

  return (
    <>
      <PageHero
        title={t('site.health.hero.title')}
        lead={t('site.health.hero.lead')}
        aside={
          <ArtPanel>
            <CropHealthIllustration className="h-auto w-full max-w-[17rem]" />
          </ArtPanel>
        }
      >
        <Callout icon={Info}>{t('site.health.hero.notice')}</Callout>
      </PageHero>

      <section className={`${WRAP} ${SECTION}`}>
        <SectionHeader title={t('site.health.flow.title')} />
        <ol className="mt-[2rem] grid list-none gap-[1rem] p-0 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map(({ title, body, Icon }, index) => (
            <li key={title} className={`reveal relative p-[1.25rem] ${CARD}`}>
              <div className="flex items-center justify-between">
                <span className="flex size-[2.75rem] items-center justify-center rounded-[0.75rem] bg-leaf-soft">
                  <Icon className="size-[1.35em] text-primary" aria-hidden="true" />
                </span>
                <span className="text-[1.75rem] font-semibold tabular-nums leading-none text-border" aria-hidden="true">
                  {index + 1}
                </span>
              </div>
              <h3 className={`mt-[1rem] ${H3}`}>{t(title)}</h3>
              <p className="mt-[0.4em] leading-relaxed text-muted">{t(body)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-surface">
        <div className={`${WRAP} ${SECTION}`}>
          <SectionHeader title={t('site.health.limits.title')} lead={t('site.health.limits.lead')} />
          <ul className="mt-[2rem] grid list-none gap-[1rem] p-0 md:grid-cols-3">
            {LIMITS.map(({ title, body }, index) => (
              <li
                key={title}
                className={[
                  'reveal flex items-start gap-[0.9em] rounded-[1rem] border p-[1.25rem]',
                  index === 0
                    ? 'border-border border-l-[0.25rem] border-l-danger bg-bg md:col-span-3 md:p-[1.75rem]'
                    : 'border-border bg-bg',
                ].join(' ')}
              >
                <Ban className="mt-[0.15em] size-[1.4em] shrink-0 text-danger" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className={index === 0 ? 'text-[1.375rem] font-semibold leading-[1.2]' : H3}>{t(title)}</h3>
                  <p className="mt-[0.4em] max-w-[44rem] leading-relaxed text-muted">{t(body)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${WRAP} py-[clamp(2.5rem,7vh,4rem)]`}>
        <Callout icon={Lock} title={t('site.health.consent.title')} className="reveal">
          {t('site.health.consent.body')}
        </Callout>
      </section>

      <RelatedLinks pages={['features', 'pilot']} />
      <CtaBand secondary={{ to: ROUTES.pages.features, label: 'site.cta.allFeatures' }} />
    </>
  );
}
