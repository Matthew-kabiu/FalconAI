import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CARD, FOCUS, H3, WRAP } from '@/components/marketing/layout';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n/en';
import { ROUTES } from '@/lib/routes';

const PAGES = {
  features: { to: ROUTES.pages.features, title: 'site.nav.features', body: 'site.related.features' },
  cropHealth: { to: ROUTES.pages.cropHealth, title: 'site.nav.cropHealth', body: 'site.related.cropHealth' },
  pilot: { to: ROUTES.pages.pilot, title: 'site.nav.pilot', body: 'site.related.pilot' },
} as const satisfies Record<string, { to: string; title: MessageKey; body: MessageKey }>;

/** "Keep reading": links from the end of one page to the other pages of the site. */
export function RelatedLinks({ pages }: { pages: readonly (keyof typeof PAGES)[] }) {
  const { t } = useLanguage();

  return (
    <nav aria-labelledby="related-title" className={`${WRAP} pb-[clamp(2rem,6vh,3.5rem)]`}>
      <h2 id="related-title" className="text-[0.9375rem] font-semibold text-muted">
        {t('site.related.title')}
      </h2>
      <ul className="mt-[0.9rem] grid list-none gap-[1rem] p-0 sm:grid-cols-2">
        {pages.map((key) => {
          const page = PAGES[key];
          return (
            <li key={key}>
              <Link
                to={page.to}
                className={`group flex h-full items-center justify-between gap-[1rem] p-[1.25rem] transition-colors hover:border-primary hover:bg-surface-hover ${CARD} ${FOCUS}`}
              >
                <span className="min-w-0">
                  <span className={`block ${H3}`}>{t(page.title)}</span>
                  <span className="mt-[0.25em] block text-muted">{t(page.body)}</span>
                </span>
                <ArrowRight
                  className="size-[1.4em] shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-[0.25em]"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
