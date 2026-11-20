// Our own time chooser (the browser's time box shows "--:-- --", AM/PM and a second
// clock icon on some phones). Same filled box as DatePicker; opens two columns,
// hours 00-23 and minutes in steps of 5, 24-hour Kenya time. Value is 'HH:MM' or ''.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Clock, X } from 'lucide-react';
import { FieldError } from '@/components/ui/FieldError';
import { IconButton } from '@/components/ui/IconButton';

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, step) => String(step * 5).padStart(2, '0'));

interface TimePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Already-translated text: placeholder, column names, close. */
  placeholder: string;
  hoursLabel: string;
  minutesLabel: string;
  closeLabel: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
}

export function TimePicker({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  hoursLabel,
  minutesLabel,
  closeLabel,
  hint,
  error,
  disabled = false,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [hour, minute] = /^\d{2}:\d{2}$/.test(value) ? value.split(':') : ['', ''];
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  // Close on a press outside.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // On opening, bring the chosen hour and minute into view and focus the hour.
  useEffect(() => {
    if (!open) return;
    for (const part of ['h', 'm'] as const) {
      const chosen = document.getElementById(`${id}-${part}-${part === 'h' ? hour || '07' : minute || '00'}`);
      chosen?.scrollIntoView({ block: 'center' });
    }
    document.getElementById(`${id}-h-${hour || '07'}`)?.focus();
  }, [open, id, hour, minute]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const onPopupKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  };

  /** Up/Down move within a column. */
  const onColumnKeyDown = (event: KeyboardEvent<HTMLDivElement>, part: 'h' | 'm', items: readonly string[]) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const current = (document.activeElement?.id ?? '').split('-').pop() ?? items[0];
    const index = Math.max(0, items.indexOf(current));
    const next = items[Math.min(items.length - 1, Math.max(0, index + (event.key === 'ArrowDown' ? 1 : -1)))];
    document.getElementById(`${id}-${part}-${next}`)?.focus();
  };

  const column = (part: 'h' | 'm', items: readonly string[], chosen: string, columnLabel: string) => (
    <div className="min-w-0 flex-1">
      <p className="px-[0.4rem] pb-[0.3rem] text-[0.75rem] font-semibold uppercase tracking-wide text-muted">{columnLabel}</p>
      <div
        role="listbox"
        aria-label={columnLabel}
        onKeyDown={(event) => onColumnKeyDown(event, part, items)}
        className="grid max-h-[13rem] gap-[0.15rem] overflow-y-auto overscroll-contain pr-[0.2rem]"
      >
        {items.map((item) => {
          const selected = item === chosen;
          return (
            <button
              key={item}
              id={`${id}-${part}-${item}`}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => {
                const nextHour = part === 'h' ? item : hour || '07';
                const nextMinute = part === 'm' ? item : minute || '00';
                onChange(`${nextHour}:${nextMinute}`);
                if (part === 'm') close();
                else document.getElementById(`${id}-m-${nextMinute}`)?.focus();
              }}
              className={[
                'min-h-[2.5rem] cursor-pointer rounded-[0.5rem] text-center text-[1rem] tabular-nums transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus',
                selected ? 'bg-primary font-semibold text-on-primary' : 'hover:bg-surface-hover',
              ].join(' ')}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      ref={wrapper}
      className="relative"
      onBlur={(event) => {
        if (wrapper.current?.contains(event.relatedTarget as Node | null)) return;
        setOpen(false);
        onBlur?.();
      }}
    >
      <label htmlFor={id} className="block text-[0.9375rem] font-medium">
        {label}
      </label>
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        onClick={() => setOpen((current) => !current)}
        className={[
          'mt-[0.4em] flex min-h-[3rem] w-full cursor-pointer items-center disabled:cursor-not-allowed disabled:opacity-50 gap-[0.6em] rounded-[0.6rem] border bg-bg px-[0.9em] py-[0.6em] text-left text-[1rem] text-fg transition-colors',
          'focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          error ? 'border-danger' : open ? 'border-primary' : 'border-transparent enabled:hover:border-border',
        ].join(' ')}
      >
        <span className={`min-w-0 flex-1 ${value ? 'font-medium tabular-nums' : 'text-muted'}`}>{value || placeholder}</span>
        <Clock className="size-[1.25em] shrink-0 text-muted" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          onKeyDown={onPopupKeyDown}
          onMouseDown={(event) => event.preventDefault()}
          className="absolute right-0 top-full z-30 mt-[0.4rem] w-[min(16rem,calc(100vw_-_1rem))] rounded-[1rem] bg-surface p-[0.6rem] text-fg shadow-xl"
        >
          <div className="flex items-center justify-between pb-[0.3rem]">
            <p className="px-[0.4rem] text-[1.25rem] font-semibold tabular-nums">
              {hour || '--'}:{minute || '--'}
            </p>
            <IconButton icon={X} label={closeLabel} onClick={close} />
          </div>
          <div className="flex gap-[0.5rem]">
            {column('h', HOURS, hour, hoursLabel)}
            {column('m', MINUTES, minute, minutesLabel)}
          </div>
        </div>
      )}

      {error && errorId && <FieldError id={errorId}>{error}</FieldError>}
      {hint && (
        <p id={hintId} className="mt-[0.4em] text-[0.875rem] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
