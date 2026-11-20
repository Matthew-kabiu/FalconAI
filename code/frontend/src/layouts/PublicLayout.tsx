import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '@/components/feedback/LoadingState';
import { CookieNotice } from '@/components/legal/CookieNotice';
import { SiteHeader } from '@/components/marketing/SiteHeader';

/**
 * Shell for public pages: the site header on top, then the page. Pages decide their
 * own width: the site pages are full width (<MarketingLayout/>), single-task pages
 * sit inside <CenteredLayout/>.
 */
export function PublicLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      {/* Keyed by path so the phone menu closes when the page changes. */}
      <SiteHeader key={pathname} />
      <main className="flex flex-1 flex-col">
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>
      <CookieNotice />
    </div>
  );
}
