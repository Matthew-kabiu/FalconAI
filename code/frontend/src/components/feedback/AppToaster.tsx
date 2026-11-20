// One global Sonner <Toaster/>, mounted once in main.tsx (Vite-Build-Template §6.1).
// Wrapped only so its screen-reader labels come from the dictionary (TaskLabs #288).
import { Toaster } from 'sonner';
import { useLanguage } from '@/hooks/use-language';

export function AppToaster() {
  const { t } = useLanguage();
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      containerAriaLabel={t('toast.regionLabel')}
      toastOptions={{ closeButtonAriaLabel: t('toast.close') }}
    />
  );
}
