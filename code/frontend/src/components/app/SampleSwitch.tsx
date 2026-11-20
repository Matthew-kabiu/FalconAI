import { FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/hooks/use-language';

interface SampleSwitchProps {
  on: boolean;
  onToggle: () => void;
}

/**
 * Development-only control for design review: shows a screen filled with sample data.
 * While it is on, a banner says so in plain words. Real builds never render this.
 */
export function SampleSwitch({ on, onToggle }: SampleSwitchProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap items-center gap-[0.75rem] rounded-[1rem] border border-dashed border-border px-[1rem] py-[0.5rem]">
      {on && (
        <p role="status" className="flex min-w-0 flex-1 items-start gap-[0.6em] font-medium">
          <FlaskConical className="mt-[0.15em] size-[1.2em] shrink-0 text-primary" aria-hidden="true" />
          {t('app.sample.banner')}
        </p>
      )}
      <Button icon={FlaskConical} variant="ghost" onClick={onToggle} aria-pressed={on} className={on ? '' : 'ml-auto'}>
        {t(on ? 'app.sample.hide' : 'app.sample.show')}
      </Button>
    </div>
  );
}
