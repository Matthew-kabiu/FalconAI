// src/App.tsx — route table ONLY; paths come from ROUTES.pages (Vite-Build-Template §4).
// ClerkProvider wraps the router here (not in main.tsx) so Clerk can navigate through
// this router instead of reloading the page between its sign-in steps.
import { lazy } from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import { AppClerkProvider } from '@/components/auth/AppClerkProvider';
import { GuestOnly } from '@/components/auth/GuestOnly';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { SignedInToApp } from '@/components/auth/SignedInToApp';
import { ErrorFallback } from '@/components/feedback/ErrorFallback';
import { AppLayout } from '@/layouts/AppLayout';
import { CenteredLayout } from '@/layouts/CenteredLayout';
import { MarketingLayout } from '@/layouts/MarketingLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { ROUTES } from '@/lib/routes';

const LandingPage = lazy(() => import('@/pages/public/LandingPage'));
const FeaturesPage = lazy(() => import('@/pages/public/FeaturesPage'));
const CropHealthPage = lazy(() => import('@/pages/public/CropHealthPage'));
const PilotPage = lazy(() => import('@/pages/public/PilotPage'));
const PrivacyPage = lazy(() => import('@/pages/public/PrivacyPage'));
const TermsPage = lazy(() => import('@/pages/public/TermsPage'));
const StartPage = lazy(() => import('@/pages/public/StartPage'));
const AuthPage = lazy(() => import('@/pages/public/AuthPage'));
const VerifyEmailPage = lazy(() => import('@/pages/public/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/public/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/public/ResetPasswordPage'));
const SsoCallbackPage = lazy(() => import('@/pages/public/SsoCallbackPage'));
const HomePage = lazy(() => import('@/pages/dashboard/HomePage'));
const FarmsPage = lazy(() => import('@/pages/dashboard/FarmsPage'));
const FarmDetailPage = lazy(() => import('@/pages/dashboard/FarmDetailPage'));
const FarmFormPage = lazy(() => import('@/pages/dashboard/FarmFormPage'));
const PlotFormPage = lazy(() => import('@/pages/dashboard/PlotFormPage'));
const CropCyclePage = lazy(() => import('@/pages/dashboard/CropCyclePage'));
const CropCycleFormPage = lazy(() => import('@/pages/dashboard/CropCycleFormPage'));
const ActivityFormPage = lazy(() => import('@/pages/dashboard/ActivityFormPage'));
const CalendarPage = lazy(() => import('@/pages/dashboard/CalendarPage'));
const EventFormPage = lazy(() => import('@/pages/dashboard/EventFormPage'));
const CropsPage = lazy(() => import('@/pages/dashboard/CropsPage'));
const AccountPage = lazy(() => import('@/pages/dashboard/AccountPage'));
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'));

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route errorElement={<ErrorFallback />}>
      {/* Public shell: site header, then the page. */}
      <Route element={<PublicLayout />}>
        {/* The public site: four full-width pages that share a footer. */}
        <Route element={<MarketingLayout />}>
          {/* Signed in? Go straight to the Home dashboard, not the landing page. */}
        <Route
          path={ROUTES.pages.start}
          element={
            <SignedInToApp>
              <LandingPage />
            </SignedInToApp>
          }
        />
          <Route path={ROUTES.pages.features} element={<FeaturesPage />} />
          <Route path={ROUTES.pages.cropHealth} element={<CropHealthPage />} />
          <Route path={ROUTES.pages.pilot} element={<PilotPage />} />
          <Route path={ROUTES.pages.legal.privacy} element={<PrivacyPage />} />
          <Route path={ROUTES.pages.legal.terms} element={<TermsPage />} />
        </Route>

        {/* Single-task pages, centred. */}
        <Route element={<CenteredLayout />}>
          <Route path={ROUTES.pages.status} element={<StartPage />} />

          {/* AUTH ROUTES — our own screens on Clerk's hooks. Signed-in visitors are sent on to Home. */}
          <Route element={<GuestOnly />}>
            {/* One screen, two tabs: a layout route, so switching tabs does not remount it. */}
            <Route element={<AuthPage />}>
              <Route path={ROUTES.pages.auth.signIn} element={null} />
              <Route path={ROUTES.pages.auth.signUp} element={null} />
            </Route>
            <Route path={ROUTES.pages.auth.verifyEmail} element={<VerifyEmailPage />} />
            <Route path={ROUTES.pages.auth.forgotPassword} element={<ForgotPasswordPage />} />
            <Route path={ROUTES.pages.auth.resetPassword} element={<ResetPasswordPage />} />
          </Route>
          {/* Coming back from Google: not guest-only, it is the page that signs the user in. */}
          <Route path={ROUTES.pages.auth.ssoCallback} element={<SsoCallbackPage />} />
          {/* END AUTH ROUTES */}

          <Route path={ROUTES.pages.notFound} element={<NotFoundPage />} />
        </Route>
      </Route>

      {/* Signed-in app: its own shell (bottom bar on phones, rail on wide screens). */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.pages.app.home} element={<HomePage />} />
          <Route path={ROUTES.pages.app.farms} element={<FarmsPage />} />
          <Route path={ROUTES.pages.app.farmNew} element={<FarmFormPage />} />
          <Route path={ROUTES.pages.app.patterns.farm} element={<FarmDetailPage />} />
          <Route path={ROUTES.pages.app.patterns.farmEdit} element={<FarmFormPage />} />
          <Route path={ROUTES.pages.app.patterns.plotNew} element={<PlotFormPage />} />
          <Route path={ROUTES.pages.app.patterns.plotEdit} element={<PlotFormPage />} />
          <Route path={ROUTES.pages.app.patterns.cropNew} element={<CropCycleFormPage />} />
          <Route path={ROUTES.pages.app.patterns.crop} element={<CropCyclePage />} />
          <Route path={ROUTES.pages.app.patterns.cropEdit} element={<CropCycleFormPage />} />
          <Route path={ROUTES.pages.app.patterns.activityNew} element={<ActivityFormPage />} />
          <Route path={ROUTES.pages.app.patterns.activityEdit} element={<ActivityFormPage />} />
          <Route path={ROUTES.pages.app.crops} element={<CropsPage />} />
          <Route path={ROUTES.pages.app.cropAdd} element={<CropCycleFormPage />} />
          <Route path={ROUTES.pages.app.calendar} element={<CalendarPage />} />
          <Route path={ROUTES.pages.app.patterns.eventNew} element={<EventFormPage />} />
          <Route path={ROUTES.pages.app.patterns.eventEdit} element={<EventFormPage />} />
          <Route path={ROUTES.pages.app.account} element={<AccountPage />} />
        </Route>
      </Route>
    </Route>,
  ),
);

const push = (to: string) => router.navigate(to);
const replace = (to: string) => router.navigate(to, { replace: true });

export default function App() {
  return (
    <AppClerkProvider navigate={push} replace={replace}>
      <RouterProvider router={router} />
    </AppClerkProvider>
  );
}
