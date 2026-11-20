// Form-level error, shown above the fields when the problem is not about one field
// (wrong email or password, too many attempts, no connection). Icon + text, announced at once.
import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';

export function FormError({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-[0.6em] rounded-[0.6em] border border-danger bg-surface px-[0.9em] py-[0.75em] text-[0.9375rem] text-fg',
        className,
      ].join(' ')}
    >
      <CircleAlert className="mt-[0.15em] size-[1.2em] shrink-0 text-danger" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
