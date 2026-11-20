// A live clock in Kenya time (EAT, UTC+3), ticking every second, whatever zone
// the phone is set to (Matt, 2026-11-19). Screen readers get the time once, not
// every second: the ticking text is hidden from them and the label carries the zone.
import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { DATE_LOCALES } from '@/components/ui/date-picker';
import { useLanguage } from '@/hooks/use-language';
import { KENYA_TIME_ZONE } from '@/lib/kenya-time';

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // Line the ticks up with the start of each second so the clock never skips one.
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      setNow(new Date());
      interval = window.setInterval(() => setNow(new Date()), 1000);
    }, 1000 - (Date.now() % 1000));
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);
  return now;
}

export function KenyaClock({ label }: { label: string }) {
  const { language } = useLanguage();
  const now = useNow();
  const time = new Intl.DateTimeFormat(DATE_LOCALES[language], {
    timeZone: KENYA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(now);

  return (
    <span className="inline-flex items-center gap-[0.5em] rounded-full bg-bg px-[0.85em] py-[0.35em] text-[0.8125rem] text-muted">
      <span className="relative flex size-[0.5rem]" aria-hidden="true">
        <span className="absolute inset-0 animate-ping rounded-full bg-leaf opacity-60 motion-reduce:hidden" />
        <span className="relative size-[0.5rem] rounded-full bg-leaf" />
      </span>
      <time dateTime={now.toISOString()} aria-hidden="true" className="font-semibold tabular-nums text-fg">
        {time}
      </time>
      <span className="inline-flex items-center gap-[0.3em]">
        <Globe className="size-[1em]" aria-hidden="true" />
        {label}
      </span>
    </span>
  );
}
