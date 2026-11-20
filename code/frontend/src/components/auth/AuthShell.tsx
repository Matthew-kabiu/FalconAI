// Shared layout for every auth screen (and the pattern for later forms).
// Wide screens: the form sits in one soft card on the left, sized to its content and
// pinned to the top; a photo of fixed height stays put on the right (it does not
// resize or move when the tabs switch), with the brand line on a card layered over it. Phones: the form card only.
// Grouping is by surface and space, never by divider lines.
// Renders inside <CenteredLayout/> under the public header, so it adds no header.
import type { ReactNode } from 'react';
import { Photo } from '@/components/marketing/Photo';
import { PHOTOS } from '@/components/marketing/photos';
import { useLanguage } from '@/hooks/use-language';

interface AuthShellProps {
  /** Already-translated page title (the h1). */
  title: string;
  /** Already-translated one-line lead under the title. */
  lead?: ReactNode;
  /** Shown above the title (the sign-in / create-account tabs). */
  top?: ReactNode;
  /** The form or step. */
  children: ReactNode;
  /** Links under the form. */
  footer?: ReactNode;
}

export function AuthShell({ title, lead, top, children, footer }: AuthShellProps) {
  const { t } = useLanguage();

  return (
    <div className="grid w-full items-start gap-[clamp(1.5rem,3vw,3.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex justify-center lg:items-start lg:pt-[clamp(0rem,4vh,3rem)]">
        <section className="w-full max-w-[30rem] rounded-[1.25rem] bg-surface p-[clamp(1.25rem,3vw,2.5rem)]">
          {top && <div className="mb-[1.75rem]">{top}</div>}
          <h1 className="text-[clamp(1.625rem,1.3rem+1.4vw,2.125rem)] font-semibold leading-[1.15] tracking-tight text-balance">
            {title}
          </h1>
          {lead && <p className="mt-[0.5rem] leading-relaxed text-muted">{lead}</p>}
          <div className="mt-[1.75rem]">{children}</div>
          {footer && <div className="mt-[1.5rem]">{footer}</div>}
        </section>
      </div>

      {/* Fixed size and sticky: the photo holds still whatever the form beside it does. */}
      <aside className="relative hidden h-[calc(100dvh-8rem)] min-h-[30rem] overflow-hidden rounded-[1.25rem] bg-leaf-soft lg:sticky lg:top-[5.5rem] lg:block">
        <Photo
          source={PHOTOS.maizeBeans}
          alt={t('site.home.hero.photoAlt')}
          sizes="(min-width: 64rem) 50vw, 1vw"
          className="absolute inset-0 h-full! rounded-none"
        />
        <div className="absolute bottom-[clamp(1rem,2vw,1.75rem)] left-[clamp(1rem,2vw,1.75rem)] right-[clamp(1rem,2vw,1.75rem)] max-w-[28rem] rounded-[1rem] bg-surface p-[clamp(1.1rem,2vw,1.5rem)] shadow-lg">
          <p className="text-[1.375rem] font-semibold leading-[1.2] text-balance">{t('auth.panel.title')}</p>
          <p className="mt-[0.4rem] leading-relaxed text-muted">{t('auth.panel.body')}</p>
        </div>
      </aside>
    </div>
  );
}
