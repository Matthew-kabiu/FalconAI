import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  /** Omit the title for a small empty note inside a panel. */
  title?: string;
  body: string;
  /** What to do next (DESIGN.md: an empty state always says so). */
  action?: ReactNode;
}

/** Says plainly that there is nothing here yet and what to do next. Never sample data. */
export function EmptyState({ icon: Icon, title, body, action }: EmptyStateProps) {
  if (!title) {
    return (
      <p className="flex items-start gap-[0.7em] py-[0.5rem] text-muted">
        <Icon className="mt-[0.1em] size-[1.3em] shrink-0" aria-hidden="true" />
        {body}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-[1rem] bg-surface px-[1.5rem] py-[clamp(2.5rem,8vh,4.5rem)] text-center">
      <span className="flex size-[4rem] items-center justify-center rounded-full bg-leaf-soft">
        <Icon className="size-[1.9rem] text-primary" aria-hidden="true" />
      </span>
      <h2 className="mt-[1.25rem] text-[1.375rem] font-semibold leading-[1.2]">{title}</h2>
      <p className="mt-[0.5em] max-w-[26rem] leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-[1.5rem] flex w-full flex-col items-center sm:w-auto">{action}</div>}
    </div>
  );
}
