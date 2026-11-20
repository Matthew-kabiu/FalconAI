// src/main.tsx — entry: language provider, root error boundary, app (Clerk + router), <Toaster/>, <AppTooltip/>.
// ClerkProvider lives in App.tsx, around the router, inside LanguageProvider.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { AppToaster } from '@/components/feedback/AppToaster';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { AppTooltip } from '@/components/ui/AppTooltip';
import { LanguageProvider } from '@/context/LanguageProvider';
// Outfit (variable weight), self-hosted so it works offline and under CSP font-src 'self'.
import '@fontsource-variable/outfit';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Outside the boundary so the friendly error page is translated too. */}
    <LanguageProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <AppToaster />
      <AppTooltip />
    </LanguageProvider>
  </StrictMode>,
);
