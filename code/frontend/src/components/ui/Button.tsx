// Button primitive — every button carries its related icon (Vite-Build-Template §6.3).
import type { ButtonHTMLAttributes } from 'react';
import { LoaderCircle, type LucideIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  variant?: Variant;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-fg hover:bg-surface-hover',
  ghost: 'bg-transparent text-fg hover:bg-surface-hover',
  danger: 'bg-danger text-on-danger hover:bg-danger-hover',
};

export function Button({
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  variant = 'primary',
  disabled,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const glyph = loading ? (
    <LoaderCircle className="size-[1.15em] shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
  ) : (
    <Icon className="size-[1.15em] shrink-0" aria-hidden="true" />
  );

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        'inline-flex min-h-[2.75rem] items-center justify-center gap-[0.5em] rounded-[0.6em] px-[1.1em] py-[0.6em]',
        'font-medium transition-colors',
        'cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        VARIANTS[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {iconPosition === 'left' && glyph}
      {children}
      {iconPosition === 'right' && glyph}
    </button>
  );
}
