// Inline field error: icon + text, never colour alone (DESIGN.md → Components and emphasis).
import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-[0.4em] flex items-start gap-[0.4em] text-[0.875rem] text-danger">
      <CircleAlert className="mt-[0.1em] size-[1.15em] shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
