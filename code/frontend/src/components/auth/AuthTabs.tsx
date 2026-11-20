// Sign in | Create account switcher. Real tabs (tablist / tab, arrow keys, roving
// tabindex); choosing one calls `onSelect`, which changes the URL.
// Look follows the site navigation: no pill and no line under the row. The active tab
// is full-strength text with a short primary bar under the word, and that one bar
// slides between the two tabs (transform only, 200ms; instant under reduced motion).
import { useRef, type KeyboardEvent } from 'react';
import { AUTH_TABS, authPanelId, authTabId, type AuthTab } from '@/components/auth/auth-tabs';
import { useLanguage } from '@/hooks/use-language';

interface AuthTabsProps {
  active: AuthTab;
  onSelect: (tab: AuthTab) => void;
  /** Already-translated name of the tab row for screen readers. */
  label: string;
}

const KEY_STEPS: Record<string, (index: number) => number> = {
  ArrowRight: (index) => (index + 1) % AUTH_TABS.length,
  ArrowLeft: (index) => (index - 1 + AUTH_TABS.length) % AUTH_TABS.length,
  Home: () => 0,
  End: () => AUTH_TABS.length - 1,
};

export function AuthTabs({ active, onSelect, label }: AuthTabsProps) {
  const { t } = useLanguage();
  const buttons = useRef<Partial<Record<AuthTab, HTMLButtonElement | null>>>({});
  const activeIndex = AUTH_TABS.findIndex((tab) => tab.id === active);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = KEY_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const next = AUTH_TABS[step(activeIndex)];
    onSelect(next.id);
    buttons.current[next.id]?.focus();
  };

  return (
    // Two equal halves across the full width, labels centred: the bar slides exactly one half.
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="relative grid w-full grid-cols-2">
      {AUTH_TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              buttons.current[tab.id] = node;
            }}
            type="button"
            role="tab"
            id={authTabId(tab.id)}
            aria-selected={selected}
            aria-controls={authPanelId(tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            className={[
              'inline-flex min-h-[3rem] cursor-pointer items-center justify-center rounded-[0.6rem] pb-[0.5rem] text-[1.0625rem] transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              selected ? 'font-semibold text-fg' : 'font-medium text-muted hover:text-fg',
            ].join(' ')}
          >
            {t(tab.label)}
          </button>
        );
      })}
      <span
        aria-hidden="true"
        className={[
          'pointer-events-none absolute bottom-[0.25rem] left-0 flex h-[0.19rem] w-1/2 justify-center',
          'transition-transform duration-200 ease-out',
          activeIndex === 1 ? 'translate-x-full' : 'translate-x-0',
        ].join(' ')}
      >
        <span className="block h-full w-[3rem] rounded-full bg-primary" />
      </span>
    </div>
  );
}
