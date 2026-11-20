// Calm, neutral message inside a form (for example "we sent you a code"). Icon + text
// on the soft leaf tint; not an error and not a success claim.
import type { ReactNode } from 'react';
import { Info, type LucideIcon } from 'lucide-react';

interface FormNoticeProps {
  /** Already-translated short heading. */
  title?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function FormNotice({ title, icon: Icon = Info, children, className = '' }: FormNoticeProps) {
  return (
    <div
      role="status"
      className={['flex items-start gap-[0.6em] rounded-[0.6em] bg-leaf-soft px-[0.9em] py-[0.75em] text-[0.9375rem] text-fg', className].join(' ')}
    >
      <Icon className="mt-[0.15em] size-[1.2em] shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <p>{children}</p>
      </div>
    </div>
  );
}
