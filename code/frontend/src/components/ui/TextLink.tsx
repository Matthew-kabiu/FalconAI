// In-app text link with a full-size tap target. `to` must come from ROUTES.pages.
import { Link, type LinkProps } from 'react-router-dom';

export function TextLink({ className = '', ...props }: LinkProps) {
  return (
    <Link
      className={[
        'inline-flex min-h-[2.75rem] items-center rounded-[0.25rem] font-medium text-primary underline underline-offset-[0.2em]',
        'hover:text-primary-hover',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        className,
      ].join(' ')}
      {...props}
    />
  );
}
