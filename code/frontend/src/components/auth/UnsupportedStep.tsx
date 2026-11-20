// Shown when Clerk asks for a step these screens cannot do (authenticator app, an
// extra account task …): a plain explanation and a way back, never a dead end.
import { RotateCcw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormNotice } from '@/components/ui/FormNotice';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n';

interface UnsupportedStepProps {
  /** Dictionary key of the explanation. */
  body?: MessageKey;
  onStartOver: () => void;
}

export function UnsupportedStep({ body = 'auth.unsupported.body', onStartOver }: UnsupportedStepProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-[1.25rem]">
      <FormNotice icon={ShieldAlert}>{t(body)}</FormNotice>
      <Button variant="secondary" icon={RotateCcw} onClick={onStartOver} className="min-h-[3rem]! w-full">
        {t('auth.startOver')}
      </Button>
    </div>
  );
}
