// Icon-only button: always an aria-label AND the global tooltip (Vite-Build-Template §6.2).
import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { APP_TOOLTIP_ID } from '@/components/ui/AppTooltip';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  icon: LucideIcon;
  /** Already-translated name, used for both the aria-label and the tooltip. */
  label: string;
}

export function IconButton({ icon: Icon, label, type = 'button', className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      data-tooltip-id={APP_TOOLTIP_ID}
      data-tooltip-content={label}
      className={[
        'inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-[0.5rem]',
        'text-muted transition-colors hover:bg-surface-hover hover:text-fg',
        'cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        className,
      ].join(' ')}
      {...rest}
    >
      <Icon className="size-[1.25em] shrink-0" aria-hidden="true" />
    </button>
  );
}
