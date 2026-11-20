// Header for every public page: brand, the four site pages, language, account.
// Phones get a menu button; from 64rem the links sit in the bar. The parent keys this
// component by pathname, so the phone menu closes itself whenever the page changes.
import { useState } from 'react';
import { Show, UserButton } from '@clerk/react';
import { ArrowRight, Menu, Sprout, X } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FOCUS, WRAP } from '@/components/marketing/layout';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { LanguageSwitch } from '@/components/ui/LanguageSwitch';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n/en';
import { ROUTES } from '@/lib/routes';

const LINKS: readonly { to: string; label: MessageKey; end?: boolean }[] = [
  { to: ROUTES.pages.start, label: 'site.nav.home', end: true },
  { to: ROUTES.pages.features, label: 'site.nav.features' },
  { to: ROUTES.pages.cropHealth, label: 'site.nav.cropHealth' },
  { to: ROUTES.pages.pilot, label: 'site.nav.pilot' },
];

const MENU_ID = 'site-menu';

// On the auth screens the tabs already offer sign-in and sign-up, so the header stays quiet.
const AUTH_PATHS: readonly string[] = Object.values(ROUTES.pages.auth).filter((path) => typeof path === 'string');

// Active page: full-strength text with a short bar under the word. Other links are
// quiet, and the bar grows in on hover. No pill, no box.
const barLink = ({ isActive }: { isActive: boolean }) =>
  [
    'relative inline-flex min-h-[2.75rem] items-center rounded-[0.4rem] px-[0.15em] transition-colors',
    'after:absolute after:inset-x-[0.15em] after:bottom-[0.35rem] after:h-[0.14rem] after:origin-left after:rounded-full after:bg-primary after:transition-transform after:duration-200',
    isActive
      ? 'font-semibold text-fg after:scale-x-100'
      : 'font-medium text-muted after:scale-x-0 hover:text-fg hover:after:scale-x-100',
    FOCUS,
  ].join(' ');

const menuLink = ({ isActive }: { isActive: boolean }) =>
  [
    'flex min-h-[3rem] items-center rounded-[0.6rem] px-[0.9em] text-[1.0625rem] font-medium transition-colors',
    isActive ? 'font-semibold text-primary' : 'text-fg hover:text-primary',
    FOCUS,
  ].join(' ');

export function SiteHeader() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const onAuthPage = AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  return (
    <header
      className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md"
      onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
    >
      <div className={`${WRAP} flex min-h-[4.5rem] items-center gap-[1rem] lg:grid lg:grid-cols-[1fr_auto_1fr]`}>
        <Link
          to={ROUTES.pages.start}
          className={`inline-flex min-h-[2.75rem] items-center gap-[0.45em] justify-self-start rounded-[0.5rem] text-[1.1875rem] font-semibold tracking-tight ${FOCUS}`}
        >
          <span className="flex size-[1.9em] items-center justify-center rounded-[0.5em] bg-primary text-on-primary">
            <Sprout className="size-[1.2em]" aria-hidden="true" />
          </span>
          {t('app.name')}
        </Link>

        <nav aria-label={t('site.nav.label')} className="hidden lg:block">
          <ul className="flex list-none items-center gap-[2.25rem] p-0">
            {LINKS.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={barLink}>
                  {t(label)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-[0.5rem] lg:ml-0 lg:justify-self-end lg:gap-[1rem]">
          <span className="hidden items-center gap-[0.25rem] lg:inline-flex">
            <LanguageToggle />
            <ThemeToggle />
          </span>
          <Show when="signed-in">
            <UserButton />
          </Show>
          {!onAuthPage && (
            <Show when="signed-out">
              <NavLink to={ROUTES.pages.auth.signIn} className={(state) => `hidden lg:inline-flex ${barLink(state)}`}>
                {t('auth.signIn.title')}
              </NavLink>
              <ButtonLink to={ROUTES.pages.auth.signUp} icon={ArrowRight} className="hidden min-h-[2.75rem] rounded-full sm:inline-flex">
                {t('site.cta.signUp')}
              </ButtonLink>
            </Show>
          )}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={MENU_ID}
            aria-label={t(open ? 'site.nav.closeMenu' : 'site.nav.openMenu')}
            onClick={() => setOpen((value) => !value)}
            className={`inline-flex size-[2.75rem] items-center justify-center rounded-[0.6rem] border border-border bg-surface text-fg transition-colors hover:bg-surface-hover lg:hidden ${FOCUS}`}
          >
            {open ? <X className="size-[1.3em]" aria-hidden="true" /> : <Menu className="size-[1.3em]" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Phone and tablet menu: pages first, then language and account, grouped. */}
      <div id={MENU_ID} hidden={!open} className="lg:hidden">
        <div className={`${WRAP} grid gap-[1.25rem] py-[1.25rem]`}>
          <nav aria-label={t('site.nav.label')}>
            <ul className="grid list-none gap-[0.25rem] p-0">
              {LINKS.map(({ to, label, end }) => (
                <li key={to}>
                  <NavLink to={to} end={end} className={menuLink}>
                    {t(label)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-[1rem]">
            <LanguageSwitch />
            <ThemeToggle />
            <Show when="signed-out">
              <NavLink to={ROUTES.pages.auth.signIn} className={barLink}>
                {t('auth.signIn.title')}
              </NavLink>
            </Show>
          </div>
          <Show when="signed-out">
            <ButtonLink to={ROUTES.pages.auth.signUp} icon={ArrowRight} className="sm:hidden">
              {t('site.cta.signUp')}
            </ButtonLink>
          </Show>
        </div>
      </div>
    </header>
  );
}
