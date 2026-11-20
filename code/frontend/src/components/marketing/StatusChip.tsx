import { CalendarClock, CircleCheck } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';

/** When a tool opens: text plus icon, never colour alone. */
export function StatusChip({ status }: { status: 'first' | 'later' }) {
  const { t } = useLanguage();
  const Icon = status === 'first' ? CircleCheck : CalendarClock;

  return (
    <span className="inline-flex items-center gap-[0.4em] rounded-full border border-border bg-bg px-[0.7em] py-[0.25em] text-[0.875rem] font-medium text-muted">
      <Icon className="size-[1.05em] shrink-0 text-primary" aria-hidden="true" />
      {t(status === 'first' ? 'site.status.first' : 'site.status.later')}
    </span>
  );
}
