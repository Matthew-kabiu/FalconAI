import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SiteFooter } from '@/components/marketing/SiteFooter';

/**
 * Wraps the four public site pages: page content, then the shared footer.
 * A new page opens at the top; a link with an #anchor scrolls to that section
 * (retried once, because pages are lazy-loaded and may not be on screen yet).
 */
export function MarketingLayout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const reveal = () => document.getElementById(hash.slice(1))?.scrollIntoView();
    reveal();
    const retry = window.setTimeout(reveal, 350);
    return () => window.clearTimeout(retry);
  }, [pathname, hash]);

  return (
    <>
      <Outlet />
      <SiteFooter />
    </>
  );
}
