import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  /** Unique id for the heading, so the panel is a labelled region. */
  id: string;
  /** A quiet link or button beside the title, e.g. "View all". */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * A titled group of related content on a signed-in screen. Panels are separated by
 * space and a soft surface, not by divider lines.
 */
export function Panel({ title, id, action, children, className = '' }: PanelProps) {
  return (
    <section aria-labelledby={id} className={['rounded-[1rem] bg-surface p-[clamp(1.1rem,2.5vw,1.75rem)]', className].join(' ')}>
      <div className="flex min-h-[2.75rem] items-center justify-between gap-[1rem]">
        <h2 id={id} className="text-[1.125rem] font-semibold leading-[1.25]">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-[0.75rem]">{children}</div>
    </section>
  );
}
