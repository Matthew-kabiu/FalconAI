// Account: who is signed in, language, sign out (DESIGN.md → Account and settings).
// Details come from Clerk; the role comes from falcon-api's GET /v1/me.
import { useClerk, useUser } from '@clerk/react';
import { LogOut, Settings, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { Panel } from '@/components/app/Panel';
import { Button } from '@/components/ui/Button';
import { LanguageSwitch } from '@/components/ui/LanguageSwitch';
import { TextLink } from '@/components/ui/TextLink';
import { ThemeRadioGroup } from '@/components/ui/ThemeRadioGroup';
import { useLanguage } from '@/hooks/use-language';
import { useMe } from '@/hooks/use-me';
import type { MessageKey } from '@/lib/i18n';
import { reopenPrivacyNotice } from '@/lib/privacy';
import { ROUTES } from '@/lib/routes';
import type { UserRole } from '@/types/api';

const ROLE_LABELS: Record<UserRole, MessageKey> = { member: 'role.member', admin: 'role.admin' };

export default function AccountPage() {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { t } = useLanguage();
  const { state } = useMe();

  const rows: readonly { label: string; value: string }[] = [
    { label: t('app.account.name'), value: user?.fullName ?? '' },
    { label: t('app.account.email'), value: user?.primaryEmailAddress?.emailAddress ?? '' },
    { label: t('home.role'), value: state.kind === 'ok' ? t(ROLE_LABELS[state.data.role] ?? 'role.member') : '' },
  ];

  return (
    <div className="grid max-w-[48rem] gap-[clamp(1.25rem,3vw,2rem)]">
      <PageHeader title={t('app.account.title')} lead={t('app.account.lead')} />

      <Panel id="details-title" title={t('app.account.details')}>
        <dl className="grid gap-[0.9rem]">
          {rows.map(({ label, value }) => (
            <div key={label} className="grid gap-[0.1rem] sm:grid-cols-[10rem_1fr] sm:gap-[1rem]">
              <dt className="text-muted">{label}</dt>
              <dd className="break-words font-medium">{value || '…'}</dd>
            </div>
          ))}
        </dl>
        <Button icon={Settings} variant="secondary" className="mt-[1.25rem] w-full sm:w-auto" onClick={() => openUserProfile()}>
          {t('app.account.manage')}
        </Button>
      </Panel>

      <Panel id="preferences-title" title={t('app.account.preferences')}>
        <div className="grid gap-[1.5rem]">
          <LanguageSwitch />
          <ThemeRadioGroup showLegend />
        </div>
      </Panel>

      <Panel id="legal-title" title={t('legal.footer.group')}>
        <div className="flex flex-wrap items-center gap-x-[1.5rem] gap-y-[0.25rem]">
          <TextLink to={ROUTES.pages.legal.privacy}>{t('legal.privacy.title')}</TextLink>
          <TextLink to={ROUTES.pages.legal.terms}>{t('legal.terms.title')}</TextLink>
        </div>
        <Button icon={SlidersHorizontal} variant="secondary" className="mt-[1rem] w-full sm:w-auto" onClick={reopenPrivacyNotice}>
          {t('legal.prefs.title')}
        </Button>
      </Panel>

      <Button
        icon={LogOut}
        variant="secondary"
        className="min-h-[3rem] w-full sm:w-fit"
        onClick={() => void signOut({ redirectUrl: ROUTES.pages.start })}
      >
        {t('app.account.signOut')}
      </Button>
    </div>
  );
}
