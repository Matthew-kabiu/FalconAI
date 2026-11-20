import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  /** One line under the title: what this screen is for, or today's date. */
  lead?: string;
  /** The screen's one primary action (and at most one quiet companion). */
  actions?: ReactNode;
}

/** Top of every signed-in screen: the only h1, an optional lead, the primary action. */
export function PageHeader({ title, lead, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-[1.5rem] gap-y-[1rem]">
      <div className="min-w-0">
        <h1 className="break-words text-[clamp(1.625rem,1.3rem+1.6vw,2.25rem)] font-semibold leading-[1.15] tracking-tight">
          {title}
        </h1>
        {lead && <p className="mt-[0.35em] text-muted">{lead}</p>}
      </div>
      {actions && <div className="flex w-full flex-col gap-[0.5rem] sm:w-auto sm:flex-row">{actions}</div>}
    </div>
  );
}
