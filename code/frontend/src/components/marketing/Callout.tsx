import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface CalloutProps {
  icon: LucideIcon;
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Sets one important fact apart from the text around it: tinted, with an accent edge. */
export function Callout({ icon: Icon, title, children, className = '' }: CalloutProps) {
  return (
    <div
      className={[
        'flex items-start gap-[0.9em] rounded-[1rem] border border-border border-l-[0.25rem] border-l-primary bg-leaf-soft/60 p-[1.1rem]',
        className,
      ].join(' ')}
    >
      <Icon className="mt-[0.1em] size-[1.4em] shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <p className={title ? 'mt-[0.2em] leading-relaxed text-muted' : 'leading-relaxed'}>{children}</p>
      </div>
    </div>
  );
}
