// Calendar date field (DESIGN.md → Interaction contract → Forms: "Dates use a custom date
// picker"). The closed control looks exactly like SearchSelect's trigger. Opening it shows a
// non-modal calendar popup following the WAI-ARIA date picker dialog pattern: a month heading
// with previous/next month buttons over a role="grid" of day buttons with a roving tabindex,
// then a "Today" button, because farmers often log things the day they do them.
// Values are calendar dates 'YYYY-MM-DD' handled in local time (see date-picker.ts).
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/FieldError';
import { IconButton } from '@/components/ui/IconButton';
import {
  addDays,
  addMonths,
  clampIso,
  DATE_LOCALES,
  DATE_POPUP_HEIGHT_REM,
  DATE_POPUP_WIDTH_REM,
  DAY_LABEL_FORMAT,
  endOfWeek,
  formatIso,
  isInRange,
  isIsoDate,
  MONTH_HEADING_FORMAT,
  monthOf,
  monthWeeks,
  startOfWeek,
  todayIso,
  TRIGGER_DATE_FORMAT,
  weekdayNames,
} from '@/components/ui/date-picker';
import { useLanguage } from '@/hooks/use-language';

interface DatePickerProps {
  id: string;
  /** Already-translated label text. */
  label: string;
  /** Chosen calendar date, 'YYYY-MM-DD', or null while nothing is chosen. */
  value: string | null;
  onChange: (value: string) => void;
  /** Earliest choosable date, 'YYYY-MM-DD', inclusive. */
  min?: string;
  /** Latest choosable date, 'YYYY-MM-DD', inclusive. */
  max?: string;
  /** Already-translated help text, shown under the field. */
  hint?: string;
  /** Already-translated error; marks the control invalid when set. */
  error?: string;
  disabled?: boolean;
  /** Called when focus leaves the whole control (trigger and popup). */
  onBlur?: () => void;
  /** Already-translated word for today, e.g. "Today" (button text and screen-reader mark). */
  todayLabel: string;
  /** Already-translated name of the previous-month button. */
  previousMonthLabel: string;
  /** Already-translated name of the next-month button. */
  nextMonthLabel: string;
  /** Already-translated "Choose a date": shown while empty and starts the trigger's name. */
  chooseDateLabel: string;
}

type Align = 'start' | 'end' | 'center';

const ALIGN_CLASSES: Record<Align, string> = {
  start: 'left-0',
  end: 'right-0',
  center: 'left-1/2 -translate-x-1/2',
};

export function DatePicker({
  id,
  label,
  value,
  onChange,
  min,
  max,
  hint,
  error,
  disabled = false,
  onBlur,
  todayLabel,
  previousMonthLabel,
  nextMonthLabel,
  chooseDateLabel,
}: DatePickerProps) {
  const { language, t } = useLanguage();
  const locale = DATE_LOCALES[language];

  const labelId = `${id}-label`;
  const promptId = `${id}-prompt`;
  const valueId = `${id}-value`;
  const dialogId = `${id}-calendar`;
  const headingId = `${id}-month`;
  const dayId = (iso: string) => `${id}-day-${iso}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLTableElement>(null);
  /** Set when the next render should move focus onto the focused day's button. */
  const moveFocus = useRef(false);

  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [align, setAlign] = useState<Align>('start');
  const today = todayIso();
  const chosen = isIsoDate(value) ? value : null;
  // The day that holds the roving tabindex; the calendar shows its month.
  const [focusDate, setFocusDate] = useState(() => clampIso(chosen ?? today, min, max));

  const weekdays = useMemo(() => weekdayNames(locale), [locale]);
  const weeks = useMemo(() => monthWeeks(focusDate), [focusDate]);
  const viewMonth = monthOf(focusDate);
  const previousDisabled = Boolean(min) && viewMonth <= monthOf(min ?? '');
  const nextDisabled = Boolean(max) && viewMonth >= monthOf(max ?? '');
  const todayInRange = isInRange(today, min, max);

  const openPopup = () => {
    if (disabled) return;
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      // Open upward when there is not enough room below and more room above.
      const below = window.innerHeight - rect.bottom;
      setOpenUp(below < DATE_POPUP_HEIGHT_REM * rem && rect.top > below);
      // Keep the calendar on screen: line it up with the field's left edge, else its right
      // edge, else centre it under the field (a phone-width field sits mid-screen).
      const width = Math.min(DATE_POPUP_WIDTH_REM * rem, window.innerWidth - rem);
      if (rect.left + width <= window.innerWidth) setAlign('start');
      else if (rect.right - width >= 0) setAlign('end');
      else setAlign('center');
    }
    setFocusDate(clampIso(chosen ?? today, min, max));
    moveFocus.current = true;
    setOpen(true);
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  };

  const choose = (iso: string) => {
    if (!isInRange(iso, min, max)) return;
    onChange(iso);
    close(true);
  };

  const moveTo = (iso: string) => {
    moveFocus.current = true;
    setFocusDate(clampIso(iso, min, max));
  };

  const shiftMonth = (delta: number) => {
    const next = clampIso(addMonths(focusDate, delta), min, max);
    const nextMonth = monthOf(next);
    // Keep focus where it was (APG), except when it is on a month button that this press
    // disables: then hand it to the grid so it is not lost.
    const onGrid = grid.current?.contains(document.activeElement) ?? false;
    const buttonNowDisabled = delta < 0 ? Boolean(min) && nextMonth <= monthOf(min ?? '') : Boolean(max) && nextMonth >= monthOf(max ?? '');
    moveFocus.current = onGrid || buttonNowDisabled;
    setFocusDate(next);
  };

  // Put focus on the focused day after opening and after keyboard moves.
  useEffect(() => {
    if (!open || !moveFocus.current) return;
    moveFocus.current = false;
    document.getElementById(`${id}-day-${focusDate}`)?.focus();
  }, [open, focusDate, id]);

  // A press anywhere outside closes the popup without moving focus.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openPopup();
    }
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    switch (event.key) {
      case 'ArrowLeft':
        moveTo(addDays(focusDate, -1));
        break;
      case 'ArrowRight':
        moveTo(addDays(focusDate, 1));
        break;
      case 'ArrowUp':
        moveTo(addDays(focusDate, -7));
        break;
      case 'ArrowDown':
        moveTo(addDays(focusDate, 7));
        break;
      case 'Home':
        moveTo(startOfWeek(focusDate));
        break;
      case 'End':
        moveTo(endOfWeek(focusDate));
        break;
      case 'PageUp':
        moveTo(addMonths(focusDate, event.shiftKey ? -12 : -1));
        break;
      case 'PageDown':
        moveTo(addMonths(focusDate, event.shiftKey ? 12 : 1));
        break;
      default:
        // Enter and Space reach the day button's own click.
        return;
    }
    event.preventDefault();
  };

  const onPopupKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    // Stop here so an enclosing modal dialog does not close too.
    event.preventDefault();
    event.stopPropagation();
    close(true);
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
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
          aria-labelledby={chosen ? `${labelId} ${promptId} ${valueId}` : `${labelId} ${valueId}`}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          onClick={() => (open ? close(true) : openPopup())}
          onKeyDown={onTriggerKeyDown}
          className={[
            // Same filled, borderless box as SearchSelect's trigger and TextField's input.
            'flex min-h-[3rem] w-full items-center gap-[0.6em] rounded-[0.6rem] border bg-bg px-[0.9em] py-[0.6em] text-left text-[1rem] text-fg transition-colors',
            'cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
            'focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
            error ? 'border-danger' : open ? 'border-primary' : 'border-transparent enabled:hover:border-border',
          ].join(' ')}
        >
          {chosen && (
            <span id={promptId} className="sr-only">
              {chooseDateLabel}
            </span>
          )}
          <span id={valueId} className={['min-w-0 flex-1 break-words', chosen ? 'tabular-nums' : 'text-muted'].join(' ')}>
            {chosen ? formatIso(chosen, locale, TRIGGER_DATE_FORMAT) : chooseDateLabel}
          </span>
          <CalendarDays className="size-[1.25em] shrink-0 text-muted" aria-hidden="true" />
        </button>

        {open && (
          <div
            id={dialogId}
            role="dialog"
            aria-labelledby={headingId}
            onKeyDown={onPopupKeyDown}
            // Presses inside the popup never move focus by themselves: day buttons and keys move
            // it on purpose, so focus is not lost when a pressed day is disabled or re-labelled.
            onMouseDown={(event) => event.preventDefault()}
            className={[
              'absolute z-30 w-[min(21rem,calc(100vw_-_1rem))] rounded-[1rem] bg-surface p-[0.5rem] text-fg shadow-xl',
              openUp ? 'bottom-full mb-[0.4rem]' : 'top-full mt-[0.4rem]',
              ALIGN_CLASSES[align],
            ].join(' ')}
          >
            <div className="flex items-center gap-[0.25rem]">
              <p id={headingId} aria-live="polite" className="min-w-0 flex-1 break-words px-[0.5em] font-semibold">
                {formatIso(`${viewMonth}-01`, locale, MONTH_HEADING_FORMAT)}
              </p>
              <IconButton icon={ChevronLeft} label={previousMonthLabel} disabled={previousDisabled} onClick={() => shiftMonth(-1)} />
              <IconButton icon={ChevronRight} label={nextMonthLabel} disabled={nextDisabled} onClick={() => shiftMonth(1)} />
              <IconButton icon={X} label={t('common.close')} onClick={() => close(true)} />
            </div>

            <table ref={grid} role="grid" aria-labelledby={headingId} onKeyDown={onGridKeyDown} className="mt-[0.25rem] w-full table-fixed border-collapse">
              <thead>
                <tr>
                  {weekdays.map((weekday) => (
                    <th key={weekday.long} scope="col" className="pb-[0.25rem] text-center text-[0.875rem] font-medium text-muted">
                      <span aria-hidden="true">{weekday.short}</span>
                      <span className="sr-only">{weekday.long}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, row) => (
                  // Rows and cells are keyed by position, so each button stays the same element
                  // while the month changes and the focused one keeps focus.
                  <tr key={row}>
                    {week.map((day, column) => {
                      const inMonth = monthOf(day) === viewMonth;
                      const inRange = isInRange(day, min, max);
                      const isSelected = day === chosen;
                      const isToday = day === today;
                      const name = formatIso(day, locale, DAY_LABEL_FORMAT);
                      return (
                        <td key={column} aria-selected={isSelected} className="p-0">
                          <button
                            id={dayId(day)}
                            type="button"
                            tabIndex={day === focusDate ? 0 : -1}
                            disabled={!inRange}
                            aria-label={isToday ? `${name}, ${todayLabel}` : name}
                            aria-current={isToday ? 'date' : undefined}
                            onClick={() => choose(day)}
                            className={[
                              'flex h-[2.75rem] w-full min-w-[2.75rem] items-center justify-center rounded-[0.6rem] text-[1rem] tabular-nums transition-colors',
                              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                              isSelected
                                ? 'cursor-pointer bg-primary font-semibold text-on-primary hover:bg-primary-hover'
                                : inRange
                                  ? ['cursor-pointer hover:bg-surface-hover', inMonth ? 'text-fg' : 'text-muted'].join(' ')
                                  : 'cursor-not-allowed text-muted line-through opacity-50',
                              isToday ? (isSelected ? 'ring-2 ring-inset ring-on-primary' : 'ring-2 ring-inset ring-primary') : '',
                            ].join(' ')}
                          >
                            {Number(day.slice(8))}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {todayInRange && (
              <Button variant="ghost" icon={CalendarCheck} onClick={() => choose(today)} className="mt-[0.25rem] w-full">
                {todayLabel}
              </Button>
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
