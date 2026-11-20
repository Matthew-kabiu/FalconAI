// Shell for every signed-in screen (Matt, 2026-11-19).
// Wide screens (from 64rem): a sidebar that is COLLAPSED by default to icons, with a
// sidebar button at its top to open it to icons plus labels. The choice is remembered.
// Medium screens and phones: no sidebar on the page; a hamburger button in the top bar
// opens the same navigation as a drawer.
// Top bar: hamburger (when there is no sidebar), then language and theme on the right.
// Foot of the sidebar or drawer: the signed-in person, with Settings and Log out.
// The current destination is full-strength text with a short bar, never a pill.
import { Suspense, useEffect, useRef, useState } from 'react';
import { CalendarDays, House, LandPlot, Menu, PanelLeftClose, PanelLeftOpen, Sprout, UserRound, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { UserMenu } from '@/components/app/UserMenu';
import { LoadingState } from '@/components/feedback/LoadingState';
import { CookieNotice } from '@/components/legal/CookieNotice';
import { APP_TOOLTIP_ID } from '@/components/ui/AppTooltip';
import { IconButton } from '@/components/ui/IconButton';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n';
import { canRemember } from '@/lib/privacy';
import { ROUTES } from '@/lib/routes';

const DESTINATIONS: readonly { to: string; label: MessageKey; Icon: LucideIcon }[] = [
  { to: ROUTES.pages.app.home, label: 'app.nav.home', Icon: House },
  { to: ROUTES.pages.app.farms, label: 'app.nav.farms', Icon: LandPlot },
  { to: ROUTES.pages.app.crops, label: 'app.nav.crops', Icon: Sprout },
  { to: ROUTES.pages.app.calendar, label: 'app.nav.calendar', Icon: CalendarDays },
  { to: ROUTES.pages.app.account, label: 'app.nav.account', Icon: UserRound },
];

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
/** Device preference: was the sidebar left open? */
const SIDEBAR_KEY = 'falcon.sidebar';

function readSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'open';
  } catch {
    return false;
  }
}

function storeSidebarOpen(open: boolean) {
  try {
    if (open && canRemember()) localStorage.setItem(SIDEBAR_KEY, 'open');
    else localStorage.removeItem(SIDEBAR_KEY);
  } catch {
    // Storage blocked: the choice still applies for this visit.
  }
}

interface NavigationProps {
  /** Icons only (the collapsed sidebar). */
  compact: boolean;
  /** Called when a destination is chosen (the drawer closes itself). */
  onNavigate?: () => void;
}

function Brand({ compact, onNavigate }: NavigationProps) {
  const { t } = useLanguage();
  return (
    <Link
      to={ROUTES.pages.app.home}
      onClick={onNavigate}
      aria-label={compact ? t('app.name') : undefined}
      className={`inline-flex min-h-[2.75rem] items-center gap-[0.6em] rounded-[0.6rem] text-[1.1875rem] font-semibold tracking-tight ${FOCUS}`}
    >
      <span className="flex size-[2.5rem] shrink-0 items-center justify-center rounded-[0.7rem] bg-primary text-on-primary">
        <Sprout className="size-[1.4rem]" aria-hidden="true" />
      </span>
      {!compact && t('app.name')}
    </Link>
  );
}

function Destinations({ compact, onNavigate }: NavigationProps) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t('app.nav.label')}>
      <ul className="grid list-none gap-[0.35rem] p-0">
        {DESTINATIONS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={onNavigate}
              aria-label={compact ? t(label) : undefined}
              data-tooltip-id={compact ? APP_TOOLTIP_ID : undefined}
              data-tooltip-content={compact ? t(label) : undefined}
              data-tooltip-place="right"
              className={({ isActive }) =>
                [
                  'relative flex min-h-[3.25rem] items-center gap-[0.9rem] rounded-[0.75rem] text-[1.0625rem] transition-colors',
                  compact ? 'justify-center' : 'px-[1rem]',
                  // The marker: a short bar on the left edge.
                  'before:absolute before:inset-y-[22%] before:left-0 before:w-[0.22rem] before:rounded-full before:bg-primary before:transition-opacity before:duration-200',
                  isActive
                    ? 'font-semibold text-fg before:opacity-100 [&>svg]:text-primary'
                    : 'font-medium text-muted before:opacity-0 hover:text-fg',
                  FOCUS,
                ].join(' ')
              }
            >
              <Icon className="size-[1.5rem] shrink-0 transition-colors" aria-hidden="true" />
              {!compact && t(label)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppLayout() {
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);

  const toggleSidebar = () => {
    storeSidebarOpen(!sidebarOpen);
    setSidebarOpen(!sidebarOpen);
  };
  const closeDrawer = () => setDrawerOpen(false);

  // The drawer is a native modal dialog: the page behind is dimmed and locked,
  // focus stays inside, and Escape closes it.
  useEffect(() => {
    if (drawerOpen && drawer.current && !drawer.current.open) drawer.current.showModal();
  }, [drawerOpen]);

  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      {/* Wide screens: the sidebar, collapsed to icons until opened. */}
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col gap-[1.5rem] bg-surface py-[1.25rem] transition-[width] duration-200 lg:flex ${
          sidebarOpen ? 'w-[clamp(15rem,18vw,18rem)] px-[1rem]' : 'w-[5rem] items-center px-[0.75rem]'
        }`}
      >
        <div className={`flex items-center gap-[0.5rem] ${sidebarOpen ? 'justify-between pl-[0.5rem]' : 'flex-col'}`}>
          <Brand compact={!sidebarOpen} />
          <IconButton
            icon={sidebarOpen ? PanelLeftClose : PanelLeftOpen}
            label={t(sidebarOpen ? 'app.nav.collapse' : 'app.nav.expand')}
            aria-expanded={sidebarOpen}
            onClick={toggleSidebar}
            data-tooltip-place="right"
          />
        </div>
        <div className="w-full">
          <Destinations compact={!sidebarOpen} />
        </div>
        <div className="mt-auto w-full">
          <UserMenu compact={!sidebarOpen} />
        </div>
      </aside>

      {/* Medium screens and phones: the same navigation as a drawer. */}
      {drawerOpen && (
        <dialog
          ref={drawer}
          aria-label={t('app.nav.label')}
          onCancel={(event) => {
            event.preventDefault();
            closeDrawer();
          }}
          // A click on the dimmed area (the dialog element itself) closes it.
          onClick={(event) => event.target === event.currentTarget && closeDrawer()}
          className="m-0 h-dvh max-h-none w-[min(20rem,86vw)] max-w-none bg-surface p-0 text-fg backdrop:bg-[rgb(0_0_0/0.6)] backdrop:backdrop-blur-[0.15rem]"
        >
          <div className="flex h-full flex-col gap-[1.5rem] px-[1rem] py-[1.25rem]">
            <div className="flex items-center justify-between pl-[0.5rem]">
              <Brand compact={false} onNavigate={closeDrawer} />
              <IconButton icon={X} label={t('common.close')} onClick={closeDrawer} />
            </div>
            <Destinations compact={false} onNavigate={closeDrawer} />
            <div className="mt-auto">
              <UserMenu onNavigate={closeDrawer} />
            </div>
          </div>
        </dialog>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[4.5rem] items-center justify-between gap-[1rem] px-[4vw] lg:px-[clamp(1.5rem,3.5vw,4rem)]">
          <div className="flex items-center gap-[0.75rem] lg:hidden">
            <button
              type="button"
              aria-label={t('app.nav.menu')}
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className={`inline-flex size-[2.75rem] cursor-pointer items-center justify-center rounded-[0.7rem] bg-surface text-fg transition-colors hover:bg-surface-hover ${FOCUS}`}
            >
              <Menu className="size-[1.4rem]" aria-hidden="true" />
            </button>
            <span className="text-[1.125rem] font-semibold tracking-tight">{t('app.name')}</span>
          </div>
          <div className="ml-auto flex items-center gap-[0.25rem]">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>
        <main className="w-full flex-1 px-[4vw] pb-[clamp(2rem,6vh,4rem)] pt-[clamp(0.5rem,2vh,1.5rem)] lg:px-[clamp(1.5rem,3.5vw,4rem)]">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <CookieNotice />
    </div>
  );
}
