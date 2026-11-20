// Home page of the public site (TaskLabs #295). Farmers first; the pilot is a plan.
// Each section answers one question and links on to the page that goes deeper.
// The route is lazy-loaded (App.tsx); only the hero photo loads up front, the rest
// load lazily as they come near the screen (components/marketing/Photo.tsx).
import {
  ArrowRight,
  CalendarClock,
  Camera,
  ChevronRight,
  CircleCheck,
  Languages,
  Lock,
  ShieldAlert,
  Smartphone,
  UserRoundCheck,
  Wheat,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowLink } from '@/components/marketing/ArrowLink';
import { Callout } from '@/components/marketing/Callout';
import { CtaBand } from '@/components/marketing/CtaBand';
import { CropCalendarIllustration, CropHealthIllustration } from '@/components/marketing/Illustrations';
import { CARD, FOCUS, H3, HOW_IT_WORKS_ID, LEAD, SECTION, WRAP } from '@/components/marketing/layout';
import { ArtPanel } from '@/components/marketing/PageHero';
import { Photo } from '@/components/marketing/Photo';
import { PHOTOS } from '@/components/marketing/photos';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { StatusChip } from '@/components/marketing/StatusChip';
import { TOOLS } from '@/components/marketing/tools';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n/en';
import { ROUTES } from '@/lib/routes';

type IconText = { title: MessageKey; body: MessageKey; Icon: LucideIcon };

const FACTS: readonly IconText[] = [
  { title: 'site.home.facts.crops.title', body: 'site.home.facts.crops.body', Icon: Wheat },
  { title: 'site.home.facts.language.title', body: 'site.home.facts.language.body', Icon: Languages },
  { title: 'site.home.facts.phone.title', body: 'site.home.facts.phone.body', Icon: Smartphone },
  { title: 'site.home.facts.privacy.title', body: 'site.home.facts.privacy.body', Icon: Lock },
];

const STEPS: readonly { title: MessageKey; body: MessageKey }[] = [
  { title: 'site.home.steps.farm.title', body: 'site.home.steps.farm.body' },
  { title: 'site.home.steps.crop.title', body: 'site.home.steps.crop.body' },
  { title: 'site.home.steps.records.title', body: 'site.home.steps.records.body' },
];

const HEALTH_POINTS: readonly { text: MessageKey; Icon: LucideIcon }[] = [
  { text: 'site.home.health.confidence', Icon: CircleCheck },
  { text: 'site.home.health.retake', Icon: Camera },
  { text: 'site.home.health.expert', Icon: UserRoundCheck },
];

// Bento: the two wide tiles carry the tint, so the grid has rhythm instead of four equal cards.
const WIDE_TOOLS = new Set(['calendar', 'health']);

export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <>
      {/* Hero: the promise, the honest status, one main action. */}
      <section className={`${WRAP} grid items-center gap-[clamp(2rem,5vw,4rem)] pb-[clamp(2.5rem,8vh,5rem)] pt-[clamp(2rem,7vh,4.5rem)] md:grid-cols-[1.1fr_1fr]`}>
        <div className="min-w-0">
          <Link
            to={ROUTES.pages.pilot}
            className={`group inline-flex min-h-[2.75rem] items-center gap-[0.5em] rounded-full border border-border bg-surface py-[0.3em] pl-[0.5em] pr-[0.8em] text-[0.9375rem] font-medium transition-colors hover:border-primary ${FOCUS}`}
          >
            <span className="flex size-[1.9em] items-center justify-center rounded-full bg-leaf-soft">
              <CalendarClock className="size-[1.1em] text-primary" aria-hidden="true" />
            </span>
            {t('site.home.hero.eyebrow')}
            <ChevronRight
              className="size-[1.1em] text-muted transition-transform duration-200 group-hover:translate-x-[0.15em]"
              aria-hidden="true"
            />
          </Link>
          <h1 className="mt-[0.6em] text-[clamp(2.125rem,1.3rem+3.6vw,3.75rem)] font-semibold leading-[1.06] tracking-tight text-balance">
            {t('site.home.hero.title')}
          </h1>
          <p className={`mt-[1.1em] max-w-[32rem] text-[1.125rem] ${LEAD}`}>{t('site.home.hero.body')}</p>
          <div className="mt-[2rem] flex flex-col gap-[0.75rem] sm:flex-row sm:flex-wrap">
            <ButtonLink to={ROUTES.pages.auth.signUp} icon={ArrowRight}>
              {t('site.cta.signUp')}
            </ButtonLink>
            <ButtonLink to={ROUTES.pages.features} icon={ChevronRight} variant="secondary">
              {t('site.cta.features')}
            </ButtonLink>
          </div>
        </div>

        {/* Photo with a soft offset block behind it and the crop calendar drawing layered on top. */}
        <div className="relative mx-auto w-full max-w-[30rem] md:max-w-none">
          <div className="absolute -right-[4%] -top-[4%] h-[62%] w-[62%] rounded-[1.25rem] bg-leaf-soft" aria-hidden="true" />
          <Photo
            source={PHOTOS.maizeBeans}
            alt={t('site.home.hero.photoAlt')}
            sizes="(min-width: 48rem) 46vw, 100vw"
            priority
            className="relative aspect-[4/3] rounded-[1.25rem] md:aspect-[5/6]"
          />
          <div className={`absolute -bottom-[5%] -left-[5%] hidden w-[46%] p-[0.9rem] shadow-lg sm:block ${CARD}`}>
            <CropCalendarIllustration className="h-auto w-full" />
          </div>
        </div>
      </section>

      {/* At a glance: four facts grouped in one quiet strip. */}
      <section aria-label={t('site.home.facts.label')} className="bg-surface">
        <ul className={`${WRAP} grid list-none grid-cols-2 gap-x-[1.5rem] gap-y-[1.5rem] py-[clamp(1.5rem,4vh,2.25rem)] lg:grid-cols-4`}>
          {FACTS.map(({ title, body, Icon }) => (
            <li key={title} className="flex items-center gap-[0.8em]">
              <span className="flex size-[2.75rem] shrink-0 items-center justify-center rounded-[0.75rem] bg-leaf-soft">
                <Icon className="size-[1.35em] text-primary" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold leading-tight">{t(title)}</span>
                <span className="mt-[0.15em] block text-[0.875rem] text-muted">{t(body)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* The four tools. Every tile is a link to its section on the Features page. */}
      <section className={`${WRAP} ${SECTION}`}>
        <SectionHeader
          kicker={t('site.home.features.kicker')}
          title={t('site.home.features.title')}
          lead={t('site.home.features.lead')}
          action={<ArrowLink to={ROUTES.pages.features}>{t('site.cta.allFeatures')}</ArrowLink>}
        />
        <ul className="mt-[2rem] grid list-none gap-[1rem] p-0 md:grid-cols-3">
          {TOOLS.map(({ id, title, short, Art, status }) => {
            const wide = WIDE_TOOLS.has(id);
            return (
              <li key={id} className={`reveal ${wide ? 'md:col-span-2' : ''}`}>
                <Link
                  to={`${ROUTES.pages.features}#${id}`}
                  className={[
                    'group flex h-full gap-[1.25rem] rounded-[1rem] border p-[clamp(1.25rem,3vw,1.75rem)] transition-colors',
                    wide
                      ? 'flex-col border-transparent bg-leaf-soft hover:border-primary sm:flex-row sm:items-center'
                      : 'flex-col border-border bg-surface hover:border-primary hover:bg-surface-hover',
                    FOCUS,
                  ].join(' ')}
                >
                  <Art className={wide ? 'h-auto w-[min(100%,13rem)] shrink-0' : 'h-auto w-[min(100%,10rem)]'} />
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-[0.6rem]">
                    <StatusChip status={status} />
                    <span className={`block ${wide ? 'text-[1.375rem] font-semibold leading-[1.2]' : H3}`}>{t(title)}</span>
                    <span className="block leading-relaxed text-muted">{t(short)}</span>
                    <span className="mt-auto inline-flex items-center gap-[0.4em] pt-[0.4rem] font-medium text-primary">
                      {t('site.cta.learnMore')}
                      <ArrowRight
                        className="size-[1.1em] transition-transform duration-200 group-hover:translate-x-[0.2em]"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Three steps, joined by a line so they read as one path. */}
      <section aria-labelledby={`${HOW_IT_WORKS_ID}-title`} id={HOW_IT_WORKS_ID} className="bg-surface">
        <div className={`${WRAP} ${SECTION} grid items-center gap-[clamp(2rem,5vw,4.5rem)] md:grid-cols-[1fr_minmax(0,26rem)]`}>
          <div className="min-w-0">
            <SectionHeader
              id={`${HOW_IT_WORKS_ID}-title`}
              title={t('site.home.steps.title')}
              lead={t('site.home.steps.lead')}
            />
            <ol className="mt-[2rem] list-none p-0">
              {STEPS.map(({ title, body }, index) => (
                <li key={title} className="relative grid grid-cols-[2.75rem_1fr] gap-[1.1rem] pb-[1.75rem] last:pb-0">
                  {index < STEPS.length - 1 && (
                    <span className="absolute bottom-0 left-[1.375rem] top-[2.75rem] w-px bg-border" aria-hidden="true" />
                  )}
                  <span
                    className="relative flex size-[2.75rem] items-center justify-center rounded-full border border-primary bg-bg text-[1.0625rem] font-semibold tabular-nums text-primary"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className="pt-[0.45rem]">
                    <h3 className={H3}>{t(title)}</h3>
                    <p className="mt-[0.3em] leading-relaxed text-muted">{t(body)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <ButtonLink to={ROUTES.pages.auth.signUp} icon={ArrowRight} className="mt-[2rem] w-full sm:w-auto">
              {t('site.cta.signUp')}
            </ButtonLink>
          </div>
          <Photo
            source={PHOTOS.hoeing}
            alt={t('site.home.steps.photoAlt')}
            sizes="(min-width: 48rem) 26rem, 100vw"
            className="reveal aspect-[4/3] rounded-[1.25rem] object-[45%_50%] md:aspect-[4/5]"
          />
        </div>
      </section>

      {/* Crop health: the promise, then the one safety limit set apart so it cannot be missed. */}
      <section className={`${WRAP} ${SECTION} grid items-center gap-[clamp(2rem,5vw,4.5rem)] md:grid-cols-[minmax(0,24rem)_1fr]`}>
        <ArtPanel className="reveal">
          <CropHealthIllustration className="h-auto w-full max-w-[18rem]" />
        </ArtPanel>
        <div className="min-w-0">
          <SectionHeader
            kicker={t('site.home.health.kicker')}
            title={t('site.home.health.title')}
            lead={t('site.home.health.body')}
          />
          <ul className="mt-[1.5rem] grid list-none gap-[0.85rem] p-0">
            {HEALTH_POINTS.map(({ text, Icon }) => (
              <li key={text} className="flex items-start gap-[0.75em]">
                <Icon className="mt-[0.1em] size-[1.4em] shrink-0 text-primary" aria-hidden="true" />
                <span className="leading-relaxed">{t(text)}</span>
              </li>
            ))}
          </ul>
          <Callout icon={ShieldAlert} title={t('site.home.health.calloutTitle')} className="mt-[1.5rem]">
            {t('site.home.health.calloutBody')}
          </Callout>
          <ArrowLink to={ROUTES.pages.cropHealth} className="mt-[1rem]">
            {t('site.cta.cropHealth')}
          </ArrowLink>
        </div>
      </section>

      {/* Who it is for: a wide photo with the message layered on it. */}
      <section className={`${WRAP} pb-[clamp(3rem,9vh,6rem)]`}>
        <div className="reveal relative">
          <Photo
            source={PHOTOS.farmers}
            alt={t('site.home.audience.photoAlt')}
            sizes="92vw"
            className="aspect-[4/3] rounded-[1.25rem] sm:aspect-[16/9] lg:aspect-[21/9]"
          />
          <div className={`relative mx-[1rem] -mt-[3rem] p-[clamp(1.25rem,3vw,1.75rem)] shadow-lg md:absolute md:bottom-[1.5rem] md:left-[1.5rem] md:mx-0 md:mt-0 md:max-w-[25rem] ${CARD}`}>
            <h2 className="text-[1.375rem] font-semibold leading-[1.2] text-balance">{t('site.home.audience.title')}</h2>
            <p className="mt-[0.5em] leading-relaxed text-muted">{t('site.home.audience.body')}</p>
            <ArrowLink to={ROUTES.pages.pilot} className="mt-[0.5rem]">
              {t('site.cta.pilot')}
            </ArrowLink>
          </div>
        </div>
      </section>

      <CtaBand secondary={{ to: ROUTES.pages.pilot, label: 'site.cta.pilot' }} />
    </>
  );
}
