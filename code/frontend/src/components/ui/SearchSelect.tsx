// Single-choice picker with type-to-search, for long lists such as Kenya's 47 counties
// (DESIGN.md → Interaction contract → Selects). The closed control looks exactly like
// TextField's input. Opening it shows a popup with a search box (role="combobox") over a
// listbox, following the WAI-ARIA combobox pattern: focus stays in the search box and
// aria-activedescendant points at the highlighted option.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { FieldError } from '@/components/ui/FieldError';
import { normalizeForSearch, POPUP_HEIGHT_REM } from '@/components/ui/search-select';

interface SearchSelectOption {
  value: string;
  label: string;
}

interface SearchSelectProps {
  id: string;
  /** Already-translated label text. */
  label: string;
  options: readonly SearchSelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  /** Already-translated name for the search box, e.g. "Search counties". */
  searchLabel: string;
  /** Already-translated text shown when the search matches nothing. */
  noResultsLabel: string;
  /** Already-translated text shown in the control while nothing is chosen. */
  placeholder: string;
  /** Already-translated help text, shown under the field. */
  hint?: string;
  /** Already-translated error; marks the control invalid when set. */
  error?: string;
  disabled?: boolean;
  /** Called when focus leaves the whole control (trigger and popup). */
  onBlur?: () => void;
}

export function SearchSelect({
  id,
  label,
  options,
  value,
  onChange,
  searchLabel,
  noResultsLabel,
  placeholder,
  hint,
  error,
  disabled = false,
  onBlur,
}: SearchSelectProps) {
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const listboxId = `${id}-listbox`;
  const optionPrefix = `${id}-option-`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const selected = options.find((option) => option.value === value) ?? null;

  // Each match keeps its position in the full list so option ids stay stable while filtering.
  const matches = useMemo(() => {
    const needle = normalizeForSearch(query);
    return options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !needle || normalizeForSearch(option.label).includes(needle));
  }, [options, query]);

  const activeMatch = matches[Math.min(active, matches.length - 1)];

  const openPopup = (initialQuery = '') => {
    if (disabled) return;
    // Open upward when there is not enough room below and more room above.
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const needed = POPUP_HEIGHT_REM * rem;
      const below = window.innerHeight - rect.bottom;
      setOpenUp(below < needed && rect.top > below);
    }
    setQuery(initialQuery);
    const chosenIndex = initialQuery ? -1 : options.findIndex((option) => option.value === value);
    setActive(Math.max(chosenIndex, 0));
    setOpen(true);
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    setQuery('');
    if (returnFocus) trigger.current?.focus();
  };

  const choose = (next: SearchSelectOption) => {
    onChange(next.value);
    close(true);
  };

  // Focus the search box once the popup is on screen.
  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);

  // Keep the highlighted option visible while moving through a long list.
  useEffect(() => {
    if (!open || !activeMatch) return;
    document.getElementById(`${optionPrefix}${activeMatch.index}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeMatch, optionPrefix]);

  // A press anywhere outside closes the popup without moving focus.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openPopup();
    } else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Typing on the closed control opens it and starts the search with that letter.
      event.preventDefault();
      openPopup(event.key);
    }
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = matches.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive((current) => Math.min(Math.min(current, last) + 1, last));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((current) => Math.max(Math.min(current, last) - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setActive(0);
        break;
      case 'End':
        event.preventDefault();
        setActive(Math.max(last, 0));
        break;
      case 'PageDown':
        event.preventDefault();
        setActive((current) => Math.min(current + 10, Math.max(last, 0)));
        break;
      case 'PageUp':
        event.preventDefault();
        setActive((current) => Math.max(current - 10, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (activeMatch) choose(activeMatch.option);
        break;
      case 'Escape':
        // Stop here so an enclosing modal dialog does not close too.
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={wrapper}
      className="relative"
      onBlur={(event) => {
        // Focus left the whole control (Tab away, or a click on something focusable outside).
        if (wrapper.current?.contains(event.relatedTarget as Node | null)) return;
        if (open) close(false);
        onBlur?.();
      }}
    >
      <label id={labelId} htmlFor={id} className="block text-[0.9375rem] font-medium">
        {label}
      </label>
      <div className="relative mt-[0.4em]">
        <button
          ref={trigger}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-labelledby={`${labelId} ${valueId}`}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          onClick={() => (open ? close(true) : openPopup())}
          onKeyDown={onTriggerKeyDown}
          className={[
            // Same filled, borderless box as TextField's input.
            'flex min-h-[3rem] w-full items-center gap-[0.6em] rounded-[0.6rem] border bg-bg px-[0.9em] py-[0.6em] text-left text-[1rem] text-fg transition-colors',
            'cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
            'focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
            error ? 'border-danger' : open ? 'border-primary' : 'border-transparent enabled:hover:border-border',
          ].join(' ')}
        >
          <span id={valueId} className={['min-w-0 flex-1 break-words', selected ? '' : 'text-muted'].join(' ')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            className={['size-[1.25em] shrink-0 text-muted transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}
            aria-hidden="true"
          />
        </button>

        {open && (
          <div
            // Presses inside the popup (option, scrollbar, padding) keep focus in the search box.
            onMouseDown={(event) => {
              if (event.target !== search.current) event.preventDefault();
            }}
            className={[
              'absolute inset-x-0 z-30 rounded-[1rem] bg-surface p-[0.5rem] text-fg shadow-xl',
              openUp ? 'bottom-full mb-[0.4rem]' : 'top-full mt-[0.4rem]',
            ].join(' ')}
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-[0.8em] top-1/2 size-[1.15em] -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                ref={search}
                type="text"
                role="combobox"
                aria-label={searchLabel}
                aria-expanded="true"
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={activeMatch ? `${optionPrefix}${activeMatch.index}` : undefined}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={searchLabel}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
                onKeyDown={onSearchKeyDown}
                className={[
                  'block min-h-[2.75rem] w-full rounded-[0.6rem] border border-transparent bg-bg py-[0.5em] pl-[2.4em] pr-[0.9em] text-[1rem] text-fg transition-colors',
                  'placeholder:text-muted hover:border-border focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                ].join(' ')}
              />
            </div>

            <ul
              id={listboxId}
              role="listbox"
              aria-labelledby={labelId}
              className="mt-[0.4rem] max-h-[min(15rem,35dvh)] list-none overflow-y-auto overscroll-contain p-0"
            >
              {matches.map(({ option, index }) => {
                const isSelected = option.value === value;
                const isActive = activeMatch?.index === index;
                return (
                  <li
                    key={option.value}
                    id={`${optionPrefix}${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onPointerMove={() => {
                      if (!isActive) setActive(matches.findIndex((match) => match.index === index));
                    }}
                    onClick={() => choose(option)}
                    className={[
                      'flex min-h-[2.75rem] cursor-pointer items-center gap-[0.6em] rounded-[0.6rem] px-[0.75em] py-[0.5em] transition-colors',
                      isActive ? 'bg-surface-hover text-fg' : '',
                      isSelected ? 'font-medium text-fg' : isActive ? '' : 'text-muted',
                    ].join(' ')}
                  >
                    <span className="min-w-0 flex-1 break-words">{option.label}</span>
                    {isSelected && <Check className="size-[1.15em] shrink-0 text-primary" aria-hidden="true" />}
                  </li>
                );
              })}
            </ul>

            {matches.length === 0 && (
              <p role="status" className="px-[0.75em] py-[0.75em] text-[0.9375rem] text-muted">
                {noResultsLabel}
              </p>
            )}
          </div>
        )}
      </div>
      {error && errorId && <FieldError id={errorId}>{error}</FieldError>}
      {hint && (
        <p id={hintId} className="mt-[0.4em] text-[0.875rem] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
