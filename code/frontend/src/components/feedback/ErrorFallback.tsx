// The single friendly error page (Vite-Build-Template §7.1). No technical detail.
import { House, RefreshCw } from 'lucide-react';
import { StateScreen } from '@/components/feedback/StateScreen';
import { WiltedSproutIllustration } from '@/components/feedback/StateIllustrations';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useLanguage } from '@/hooks/use-language';
import { ROUTES } from '@/lib/routes';

export function ErrorFallback() {
  const { t } = useLanguage();
  // Full page loads on purpose: the boundary may sit above the router, and a fresh
  // load is the surest way to clear whatever state caused the error.
  const reload = () => window.location.reload();
  const goHome = () => window.location.assign(ROUTES.pages.start);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      {/* Rendered outside the layouts, so it carries its own language control. */}
      <header className="flex justify-end px-[4vw] pt-[clamp(0.75rem,3vh,1.5rem)]">
        <LanguageToggle />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-[4vw] py-[clamp(1.5rem,6vh,4rem)]">
        <StateScreen
          Art={WiltedSproutIllustration}
          title={t('errorPage.title')}
          body={t('errorPage.body')}
          actions={
            <>
              <Button icon={RefreshCw} className="min-h-[3rem]" onClick={reload}>
                {t('common.reload')}
              </Button>
              <Button icon={House} variant="secondary" className="min-h-[3rem]" onClick={goHome}>
                {t('errorPage.goHome')}
              </Button>
            </>
          }
        />
      </main>
    </div>
  );
}
