// The signed-in person at the foot of the sidebar: photo, name and email, opening a
// small menu with Settings and Log out. Falcon AI's own control (not Clerk's widget),
// so it matches the rest of the app and is in both languages.
import { useEffect, useId, useRef, useState } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { ChevronsUpDown, LogOut, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/use-language';
import { ROUTES } from '@/lib/routes';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const ITEM = `flex min-h-[3rem] w-full cursor-pointer items-center gap-[0.75em] rounded-[0.6rem] px-[0.85rem] text-left font-medium transition-colors hover:bg-surface-hover ${FOCUS}`;

interface UserMenuProps {
  /** Icon-only sidebar: show just the photo. */
  compact?: boolean;
  /** Called after a menu item is chosen (the phone drawer closes itself). */
  onNavigate?: () => void;
}

export function UserMenu({ compact = false, onNavigate }: UserMenuProps) {
  const { t } = useLanguage();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Close when the person clicks or tabs anywhere else.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  if (!user) return null;

  const name = user.fullName?.trim() || user.firstName?.trim() || t('app.nav.account');
  const email = user.primaryEmailAddress?.emailAddress ?? '';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
      onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={compact ? `${t('app.user.menu')}: ${name}` : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full cursor-pointer items-center gap-[0.75rem] rounded-[0.85rem] p-[0.5rem] text-left transition-colors hover:bg-surface-hover ${compact ? 'justify-center' : ''} ${FOCUS}`}
      >
        {user.hasImage ? (
          <img src={user.imageUrl} alt="" width={40} height={40} className="size-[2.5rem] shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-[2.5rem] shrink-0 items-center justify-center rounded-full bg-leaf-soft font-semibold text-primary" aria-hidden="true">
            {initial}
          </span>
        )}
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold leading-tight">{name}</span>
              <span className="mt-[0.15em] block truncate text-[0.875rem] text-muted">{email}</span>
            </span>
            <ChevronsUpDown className="size-[1.1em] shrink-0 text-muted" aria-hidden="true" />
          </>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('app.user.menu')}
          className="absolute bottom-full left-0 z-50 mb-[0.5rem] w-[min(17rem,80vw)] rounded-[1rem] bg-bg p-[0.4rem] shadow-[0_0.5rem_2rem_rgb(0_0_0/0.3)]"
        >
          {/* In the icon-only sidebar the name and email are shown here instead. */}
          {compact && (
            <p className="px-[0.85rem] pb-[0.5rem] pt-[0.6rem]">
              <span className="block truncate font-semibold leading-tight">{name}</span>
              <span className="mt-[0.15em] block truncate text-[0.875rem] text-muted">{email}</span>
            </p>
          )}
          <Link
            role="menuitem"
            to={ROUTES.pages.app.account}
            className={ITEM}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            <Settings className="size-[1.25em] shrink-0 text-muted" aria-hidden="true" />
            {t('app.user.settings')}
          </Link>
          <button
            type="button"
            role="menuitem"
            className={ITEM}
            onClick={() => {
              setOpen(false);
              void signOut({ redirectUrl: ROUTES.pages.start });
            }}
          >
            <LogOut className="size-[1.25em] shrink-0 text-muted" aria-hidden="true" />
            {t('app.account.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
