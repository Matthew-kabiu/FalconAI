// Footer for the public site: brand and safety note, then every page grouped by
// purpose (the site map), then photo credits tucked into a disclosure.
import { ChevronDown, ShieldAlert, Sprout } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FOCUS, HOW_IT_WORKS_ID, WRAP } from '@/components/marketing/layout';
import { LanguageSwitch } from '@/components/ui/LanguageSwitch';
import { ThemeRadioGroup } from '@/components/ui/ThemeRadioGroup';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n/en';
import { reopenPrivacyNotice } from '@/lib/privacy';
import { ROUTES } from '@/lib/routes';

const GROUPS: readonly { title: MessageKey; links: readonly { to: string; label: MessageKey }[] }[] = [
  {
    title: 'site.footer.product',
    links: [
      { to: ROUTES.pages.features, label: 'site.nav.features' },
      { to: ROUTES.pages.cropHealth, label: 'site.nav.cropHealth' },
      { to: `${ROUTES.pages.start}#${HOW_IT_WORKS_ID}`, label: 'site.footer.howItWorks' },
    ],
  },
  {
    title: 'site.footer.project',
    links: [
      { to: ROUTES.pages.pilot, label: 'site.nav.pilot' },
      { to: ROUTES.pages.status, label: 'site.footer.status' },
    ],
  },
  {
    title: 'site.footer.account',
    links: [
      { to: ROUTES.pages.auth.signUp, label: 'site.cta.signUp' },
      { to: ROUTES.pages.auth.signIn, label: 'auth.signIn.title' },
    ],
  },
];

// Licence terms (CC BY / CC BY-SA) require crediting the author and the licence.
const BY_SA_4 = { license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' };
const BY_SA_2 = { license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/' };
const CREDITS = [
  {
    title: 'Maize and beans farm',
    author: 'Cut angles',
    page: 'https://commons.wikimedia.org/wiki/File:Maize_and_beans_farm.jpg',
    ...BY_SA_4,
  },
  {
    title: '2DU Kenya 86',
    author: 'Neil Palmer (CIAT)',
    page: 'https://commons.wikimedia.org/wiki/File:2DU_Kenya_86_(5367322642).jpg',
    ...BY_SA_2,
  },
  {
    title: 'Woman farmer in Kenya',
    author: 'Neil Palmer (CIAT)',
    page: 'https://commons.wikimedia.org/wiki/File:Woman_farmer_in_Kenya.jpg',
    ...BY_SA_2,
  },
  {
    title: 'Women smallholder farmers in Kenya',
    author: 'McKay Savage',
    page: 'https://commons.wikimedia.org/wiki/File:Women_smallholder_farmers_in_Kenya.jpg',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
] as const;

const FOOT_LINK = `inline-flex min-h-[2.75rem] items-center rounded-[0.25rem] text-muted underline decoration-transparent underline-offset-[0.25em] transition-colors hover:text-fg hover:decoration-current ${FOCUS}`;
const EXTERNAL = `rounded-[0.25rem] underline underline-offset-[0.2em] hover:text-fg ${FOCUS}`;

export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="bg-surface">
      <div className={`${WRAP} py-[clamp(2.5rem,7vh,4rem)]`}>
        <div className="grid gap-[2.5rem] md:grid-cols-[1.5fr_2fr]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-[0.45em] text-[1.1875rem] font-semibold tracking-tight">
              <span className="flex size-[1.9em] items-center justify-center rounded-[0.5em] bg-primary text-on-primary">
                <Sprout className="size-[1.2em]" aria-hidden="true" />
              </span>
              {t('app.name')}
            </p>
            <p className="mt-[1rem] max-w-[24rem] leading-relaxed text-muted">{t('site.footer.tagline')}</p>
            <LanguageSwitch className="mt-[1.25rem]" />
            <ThemeRadioGroup className="mt-[0.75rem]" />
          </div>

          <div className="grid grid-cols-2 gap-x-[1.5rem] gap-y-[2rem] sm:grid-cols-4">
            {GROUPS.map((group) => (
              <nav key={group.title} aria-label={t(group.title)}>
                <h2 className="text-[0.9375rem] font-semibold">{t(group.title)}</h2>
                <ul className="mt-[0.5rem] list-none p-0">
                  {group.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to} className={FOOT_LINK}>
                        {t(link.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <nav aria-label={t('legal.footer.group')}>
              <h2 className="text-[0.9375rem] font-semibold">{t('legal.footer.group')}</h2>
              <ul className="mt-[0.5rem] list-none p-0">
                <li>
                  <Link to={ROUTES.pages.legal.privacy} className={FOOT_LINK}>
                    {t('legal.privacy.title')}
                  </Link>
                </li>
                <li>
                  <Link to={ROUTES.pages.legal.terms} className={FOOT_LINK}>
                    {t('legal.terms.title')}
                  </Link>
                </li>
                <li>
                  {/* Reopens the cookie notice with its preferences showing. */}
                  <button type="button" onClick={reopenPrivacyNotice} className={`cursor-pointer text-left ${FOOT_LINK}`}>
                    {t('legal.prefs.title')}
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <p className="mt-[2.5rem] flex items-start gap-[0.75em] rounded-[1rem] border border-border bg-bg p-[1rem] text-[0.9375rem] leading-relaxed">
          <ShieldAlert className="mt-[0.1em] size-[1.35em] shrink-0 text-primary" aria-hidden="true" />
          {t('site.footer.note')}
        </p>

        <details className="group mt-[1.25rem] text-[0.875rem] text-muted">
          <summary
            className={`inline-flex min-h-[2.75rem] cursor-pointer list-none items-center gap-[0.4em] rounded-[0.25rem] font-medium hover:text-fg [&::-webkit-details-marker]:hidden ${FOCUS}`}
          >
            {t('site.footer.photos')}
            <ChevronDown className="size-[1.1em] transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="mt-[0.25rem]">{t('site.footer.photosSource')}</p>
          <ul className="mt-[0.5rem] grid list-none gap-[0.4em] p-0">
            {CREDITS.map((credit) => (
              <li key={credit.page}>
                <a href={credit.page} className={EXTERNAL} rel="noopener noreferrer" target="_blank">
                  {credit.title}
                </a>{' '}
                {t('site.footer.by')} {credit.author},{' '}
                <a href={credit.licenseUrl} className={EXTERNAL} rel="noopener noreferrer" target="_blank">
                  {credit.license}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </footer>
  );
}
