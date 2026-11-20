import { House, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StateScreen } from '@/components/feedback/StateScreen';
import { LostPathIllustration } from '@/components/feedback/StateIllustrations';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/hooks/use-language';
import { ROUTES } from '@/lib/routes';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <StateScreen
      Art={LostPathIllustration}
      title={t('notFound.title')}
      body={t('notFound.body')}
      actions={
        <>
          <Button icon={House} className="min-h-[3rem]" onClick={() => navigate(ROUTES.pages.start)}>
            {t('notFound.back')}
          </Button>
          {/* A fresh load also picks up pages added since this tab was opened. */}
          <Button icon={RefreshCw} variant="secondary" className="min-h-[3rem]" onClick={() => window.location.reload()}>
            {t('common.reload')}
          </Button>
        </>
      }
    />
  );
}
