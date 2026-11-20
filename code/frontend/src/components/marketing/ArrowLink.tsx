import { ArrowRight } from 'lucide-react';
import { Link, type LinkProps } from 'react-router-dom';
import { FOCUS } from '@/components/marketing/layout';

/** Inline "go deeper" link to another page of the site. The arrow nudges on hover. */
export function ArrowLink({ className = '', children, ...props }: LinkProps) {
  return (
    <Link
      className={[
        'group inline-flex min-h-[2.75rem] items-center gap-[0.4em] rounded-[0.25rem] font-medium text-primary hover:text-primary-hover',
        FOCUS,
        className,
      ].join(' ')}
      {...props}
    >
      <span className="underline decoration-transparent underline-offset-[0.25em] transition-colors group-hover:decoration-current">
        {children}
      </span>
      <ArrowRight
        className="size-[1.1em] shrink-0 transition-transform duration-200 group-hover:translate-x-[0.2em]"
        aria-hidden="true"
      />
    </Link>
  );
}
