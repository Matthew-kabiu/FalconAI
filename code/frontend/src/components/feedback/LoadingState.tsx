import { LoaderCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

interface LoadingStateProps {
  /** Already-translated text; defaults to the dictionary's "Loading…". */
  label?: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  const { t } = useLanguage();

  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-[0.6em] p-[1em] text-muted">
      <LoaderCircle className="size-[1.25em] shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}
