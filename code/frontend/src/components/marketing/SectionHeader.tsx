import type { ReactNode } from 'react';
import { H2, LEAD } from '@/components/marketing/layout';

interface SectionHeaderProps {
  /** Small label above the title. Use sparingly: most sections need none. */
  kicker?: string;
  title: string;
  lead?: string;
  id?: string;
  /** A link or action shown beside the title on wide screens. */
  action?: ReactNode;
  className?: string;
}

/** One consistent heading block: kicker, title, lead, stacked and left-aligned. */
export function SectionHeader({ kicker, title, lead, id, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={['flex flex-wrap items-end justify-between gap-x-[2rem] gap-y-[1rem]', className].join(' ')}>
      <div className="min-w-0 max-w-[40rem]">
        {kicker && <p className="mb-[0.6em] text-[0.9375rem] font-semibold text-primary">{kicker}</p>}
        <h2 id={id} className={H2}>
          {title}
        </h2>
        {lead && <p className={`mt-[0.75em] ${LEAD}`}>{lead}</p>}
      </div>
      {action}
    </div>
  );
}
