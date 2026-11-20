// A navigation link that looks like a Button (same sizes, variants and icon rule).
// Use it when the action moves to another page; use <Button/> for in-page actions.
import type { LucideIcon } from 'lucide-react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'accent';

interface ButtonLinkProps extends LinkProps {
  icon: LucideIcon;
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-fg hover:bg-surface-hover',
  /** Lime action for use on the deep-green call-to-action band only. */
  accent: 'bg-brand-accent text-on-brand-accent hover:bg-brand-accent-hover',
};

export function ButtonLink({ icon: Icon, variant = 'primary', className = '', children, ...rest }: ButtonLinkProps) {
  return (
    <Link
      className={[
        'group inline-flex min-h-[3rem] items-center justify-center gap-[0.5em] rounded-[0.6em] px-[1.25em] py-[0.6em]',
        'font-medium transition-colors active:translate-y-[0.0625rem]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        VARIANTS[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
      <Icon
        className="size-[1.15em] shrink-0 transition-transform duration-200 group-hover:translate-x-[0.15em]"
        aria-hidden="true"
      />
    </Link>
  );
}
