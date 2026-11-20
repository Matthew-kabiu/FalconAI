// The cookie notice, with the privacy preferences inside it (no separate page).
// Shown until the person answers it, and again when they reopen it from the footer
// or Account. It is a modal (Matt, 2026-11-19): anchored at the bottom of the screen like
// a familiar cookie banner, with the page dimmed behind it, so it reads as separate from the content and must be answered first.
import { useEffect, useRef, useState } from 'react';
import { Check, Lock, SlidersHorizontal, X } from 'lucide-react';
import { notify } from '@/components/feedback/toast';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Switch } from '@/components/ui/Switch';
import { TextLink } from '@/components/ui/TextLink';
import { useLanguage } from '@/hooks/use-language';
import { usePrivacy } from '@/hooks/use-privacy';
import { acceptPrivacy, setRemember } from '@/lib/privacy';
import { ROUTES } from '@/lib/routes';

export function CookieNotice() {
  const { t } = useLanguage();
  const { decided, remember, reopened } = usePrivacy();
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const visible = !decided || reopened;

  // A native modal dialog: the browser dims and locks the page behind it, keeps
  // keyboard focus inside, and returns focus to where it was when it closes.
  useEffect(() => {
    if (visible && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [visible]);

  if (!visible) return null;
  const showPreferences = expanded || reopened;

  const close = () => {
    setExpanded(false);
    acceptPrivacy();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="cookie-notice-title"
      // Escape answers the notice the same way "OK" does: keep the current choice.
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="mx-auto mb-[clamp(1rem,3vh,2rem)] mt-auto max-h-[calc(100dvh-2rem)] w-[min(40rem,92vw)] overflow-y-auto rounded-[1.25rem] bg-surface p-[clamp(1.25rem,3vw,2rem)] text-fg shadow-[0_1rem_4rem_rgb(0_0_0/0.4)] backdrop:bg-[rgb(0_0_0/0.6)] backdrop:backdrop-blur-[0.15rem]"
    >
      <div className="flex items-start justify-between gap-[1rem]">
        <h2 id="cookie-notice-title" className="pt-[0.35rem] text-[1.375rem] font-semibold leading-[1.2]">
          {t(showPreferences ? 'legal.prefs.title' : 'legal.banner.title')}
        </h2>
        {/* Closing with the X answers the notice the same way "OK" does. */}
        <IconButton icon={X} label={t('common.close')} onClick={close} className="-mr-[0.5rem] -mt-[0.25rem] shrink-0 rounded-full!" />
      </div>
      <p className="mt-[0.5rem] leading-relaxed text-muted">{t(showPreferences ? 'legal.prefs.intro' : 'legal.banner.body')}</p>

      {showPreferences && (
        <ul className="mt-[1.25rem] grid list-none gap-[0.6rem] p-0">
          <li className="rounded-[0.85rem] bg-bg p-[1rem]">
            <div className="flex items-center justify-between gap-[1rem]">
              <h3 className="font-semibold">{t('legal.prefs.essential.title')}</h3>
              <span className="inline-flex shrink-0 items-center gap-[0.4em] text-[0.875rem] font-medium text-muted">
                <Lock className="size-[1.1em]" aria-hidden="true" />
                {t('legal.prefs.alwaysOn')}
              </span>
            </div>
            <p className="mt-[0.3rem] text-[0.9375rem] leading-relaxed text-muted">{t('legal.prefs.essential.body')}</p>
          </li>
          <li className="rounded-[0.85rem] bg-bg p-[1rem]">
            <div className="flex items-center justify-between gap-[1rem]">
              <h3 id="cookie-remember-title" className="font-semibold">
                {t('legal.prefs.remember.title')}
              </h3>
              <Switch
                checked={remember}
                onChange={(next) => {
                  setRemember(next);
                  notify.success(t('legal.prefs.saved'));
                }}
                labelledBy="cookie-remember-title"
                onLabel={t('legal.prefs.on')}
                offLabel={t('legal.prefs.off')}
              />
            </div>
            <p className="mt-[0.3rem] text-[0.9375rem] leading-relaxed text-muted">{t('legal.prefs.remember.body')}</p>
          </li>
          <li className="rounded-[0.85rem] bg-bg p-[1rem]">
            <div className="flex items-center justify-between gap-[1rem]">
              <h3 className="font-semibold">{t('legal.prefs.tracking.title')}</h3>
              <span className="shrink-0 text-[0.875rem] font-medium text-muted">{t('legal.prefs.notUsed')}</span>
            </div>
            <p className="mt-[0.3rem] text-[0.9375rem] leading-relaxed text-muted">{t('legal.prefs.tracking.body')}</p>
          </li>
        </ul>
      )}

      <div className="mt-[1.25rem] flex flex-wrap items-center gap-x-[0.75rem] gap-y-[0.5rem]">
        <Button icon={Check} onClick={close} className="min-h-[3rem] flex-1 sm:flex-none sm:px-[1.75em]">
          {t('legal.banner.accept')}
        </Button>
        {!showPreferences && (
          <Button icon={SlidersHorizontal} variant="secondary" onClick={() => setExpanded(true)} className="min-h-[3rem] flex-1 sm:flex-none">
            {t('legal.banner.manage')}
          </Button>
        )}
        <TextLink to={ROUTES.pages.legal.privacy} className="text-[0.9375rem]">
          {t('legal.prefs.more')}
        </TextLink>
      </div>
    </dialog>
  );
}
