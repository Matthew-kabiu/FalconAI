// "Continue with Google": the one social sign-in option, as a full-width outlined button
// carrying Google's own mark (see GoogleIcon.tsx for the approved exception).
// Same size, focus ring and loading behaviour as <Button/>, which only takes lucide icons.
import { LoaderCircle } from 'lucide-react';
import { GoogleIcon } from '@/components/ui/GoogleIcon';

interface GoogleButtonProps {
  /** Already-translated label. */
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function GoogleButton({ label, loading = false, disabled = false, onClick }: GoogleButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      className={[
        'inline-flex min-h-[3rem] w-full items-center justify-center gap-[0.6em] rounded-[0.6em] px-[1.1em] py-[0.6em]',
        'border border-border bg-bg font-medium text-fg transition-colors hover:bg-surface-hover',
        'cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
      ].join(' ')}
    >
      {loading ? (
        <LoaderCircle className="size-[1.2em] shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <GoogleIcon className="size-[1.2em] shrink-0" />
      )}
      {label}
    </button>
  );
}
