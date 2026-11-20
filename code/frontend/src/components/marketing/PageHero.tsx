import type { ReactNode } from 'react';
import { LEAD, WRAP } from '@/components/marketing/layout';

interface PageHeroProps {
  title: string;
  lead: string;
  /** Extra content under the lead, such as a notice or jump links. */
  children?: ReactNode;
  /** The visual on the right: an illustration panel or a photo. */
  aside: ReactNode;
}

/** Top of an inner page: one headline, one sentence, one visual. */
export function PageHero({ title, lead, children, aside }: PageHeroProps) {
  return (
    <section className="bg-surface">
      <div
        className={`${WRAP} grid items-center gap-[clamp(1.5rem,4vw,3.5rem)] py-[clamp(2rem,7vh,4.5rem)] md:grid-cols-[1.15fr_1fr]`}
      >
        <div className="min-w-0">
          <h1 className="text-[clamp(1.875rem,1.3rem+2.6vw,3rem)] font-semibold leading-[1.1] tracking-tight text-balance">
            {title}
          </h1>
          <p className={`mt-[0.8em] max-w-[34rem] text-[1.125rem] ${LEAD}`}>{lead}</p>
          {children && <div className="mt-[1.5rem]">{children}</div>}
        </div>
        {aside}
      </div>
    </section>
  );
}

/** Tinted panel that frames an illustration as a page or section visual. */
export function ArtPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={['flex items-center justify-center rounded-[1.25rem] bg-leaf-soft p-[clamp(1.5rem,5vw,3rem)]', className].join(' ')}
    >
      {children}
    </div>
  );
}
