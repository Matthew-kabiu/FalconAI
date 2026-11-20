// The one sign-in / create-account screen. A layout route in App.tsx renders it for both
// /sign-in and /sign-up, so switching tabs changes the URL without remounting anything:
// typed values stay, and the tab bar and panels can animate.
// Both panels stay mounted in the same spot; the active one is in the flow, the other
// is laid over it, invisible and inert. Only opacity and translate (a transform) are animated, 200ms,
// and each panel slides towards its own tab's side. Reduced motion makes it instant.
// Signed-in visitors never reach this page (GuestOnly).
import { useSignIn } from '@clerk/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isAuthBlocked } from '@/components/auth/auth-state';
import { AUTH_TABS, authPanelId, authTabFor, authTabId, type AuthTab } from '@/components/auth/auth-tabs';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthTabs } from '@/components/auth/AuthTabs';
import { attempt } from '@/components/auth/clerk-errors';
import { ClientTrustStep } from '@/components/auth/ClientTrustStep';
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { UnsupportedStep } from '@/components/auth/UnsupportedStep';
import { useLanguage } from '@/hooks/use-language';
import type { MessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';

const HEADINGS: Record<AuthTab, { title: MessageKey; lead: MessageKey }> = {
  signIn: { title: 'auth.signIn.heading', lead: 'auth.signIn.lead' },
  signUp: { title: 'auth.signUp.title', lead: 'auth.signUp.lead' },
};

/** Where the hidden panel waits: on its own tab's side, so it slides in from there. */
const AWAY: Record<AuthTab, string> = {
  signIn: '-translate-x-[1rem]',
  signUp: 'translate-x-[1rem]',
};

type Step = 'tabs' | 'trust' | 'unsupported';

export default function AuthPage() {
  const { t } = useLanguage();
  const { signIn } = useSignIn();
  const location = useLocation();
  const navigate = useNavigate();
  const active = authTabFor(location.pathname);

  // A sign-in that Clerk has paused for one more step takes over the sign-in tab.
  let step: Step = 'tabs';
  if (active === 'signIn') {
    const canEmailCode = (signIn.supportedSecondFactors ?? []).some((factor) => factor.strategy === 'email_code');
    if (isAuthBlocked(location.state) || signIn.status === 'needs_second_factor') step = 'unsupported';
    else if (signIn.status === 'needs_client_trust') step = canEmailCode ? 'trust' : 'unsupported';
  }

  const select = (tab: AuthTab) => {
    const target = AUTH_TABS.find((item) => item.id === tab);
    if (target && tab !== active) void navigate({ pathname: target.path, search: location.search }, { replace: true });
  };

  const startOver = async () => {
    await attempt(() => signIn.reset());
    void navigate({ pathname: ROUTES.pages.auth.signIn, search: location.search }, { replace: true, state: null });
  };

  if (step === 'trust') {
    return (
      <AuthShell title={t('auth.trust.title')} lead={t('auth.trust.lead')}>
        <ClientTrustStep onStartOver={() => void startOver()} />
      </AuthShell>
    );
  }

  if (step === 'unsupported') {
    return (
      <AuthShell title={t('auth.unsupported.title')}>
        <UnsupportedStep onStartOver={() => void startOver()} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      top={<AuthTabs active={active} onSelect={select} label={t('auth.tabs.label')} />}
      title={t(HEADINGS[active].title)}
      lead={t(HEADINGS[active].lead)}
    >
      {/* The clip keeps the hidden panel from adding height; the padding leaves room for focus rings. */}
      <div className="relative -m-[0.5rem] overflow-clip p-[0.5rem]">
        {AUTH_TABS.map((tab) => {
          const shown = tab.id === active;
          return (
            <div
              key={tab.id}
              role="tabpanel"
              id={authPanelId(tab.id)}
              aria-labelledby={authTabId(tab.id)}
              inert={!shown}
              className={[
                'transition-[opacity,translate,visibility] duration-200 ease-out',
                shown ? 'visible translate-x-0 opacity-100' : `invisible absolute inset-x-[0.5rem] top-[0.5rem] opacity-0 ${AWAY[tab.id]}`,
              ].join(' ')}
            >
              {tab.id === 'signIn' ? <SignInForm /> : <SignUpForm />}
            </div>
          );
        })}
      </div>
    </AuthShell>
  );
}
