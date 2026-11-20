// Helpers for DatePicker, kept apart so the component file only exports components.
// Every date here is a calendar date written 'YYYY-MM-DD'. Dates are built from their parts
// in local time (never `new Date('YYYY-MM-DD')`, which JavaScript reads as UTC midnight), so a
// chosen day never shifts by a time zone. ISO strings of this shape also sort and compare as
// plain strings, which the range checks rely on.
import type { Language } from '@/lib/i18n';

/** Locale used for month and weekday names (same mapping as lib/format.ts). */
export const DATE_LOCALES: Record<Language, string> = { en: 'en-KE', sw: 'sw-KE' };

/** Space (in rem) the open calendar needs: header, weekday row, six weeks and the Today button. */
export const DATE_POPUP_HEIGHT_REM = 26;

/** Width (in rem) of the open calendar: seven day columns of at least 2.75rem plus padding. */
export const DATE_POPUP_WIDTH_REM = 21;

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (value: number) => String(value).padStart(2, '0');

/** The date as YYYY-MM-DD, read in local time. */
export function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A local-time Date for a YYYY-MM-DD string, or null when it is not a real calendar date. */
export function fromIso(iso: string): Date | null {
  const match = ISO_PATTERN.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  // Reject dates that rolled over, such as 2026-02-31.
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

export function isIsoDate(value: string | null | undefined): value is string {
  return typeof value === 'string' && fromIso(value) !== null;
}

/** Today's calendar date in local time. */
export function todayIso(): string {
  return toIso(new Date());
}

function partsOf(iso: string): [number, number, number] {
  const date = fromIso(iso) ?? new Date();
  return [date.getFullYear(), date.getMonth(), date.getDate()];
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = partsOf(iso);
  return toIso(new Date(year, month, day + days));
}

/** Same day `months` later; a day that does not exist there becomes that month's last day. */
export function addMonths(iso: string, months: number): string {
  const [year, month, day] = partsOf(iso);
  const lastDay = new Date(year, month + months + 1, 0).getDate();
  return toIso(new Date(year, month + months, Math.min(day, lastDay)));
}

/** 0 for Monday through 6 for Sunday: weeks start on Monday. */
function weekdayIndex(iso: string): number {
  const [year, month, day] = partsOf(iso);
  return (new Date(year, month, day).getDay() + 6) % 7;
}

export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

export function endOfWeek(iso: string): string {
  return addDays(iso, 6 - weekdayIndex(iso));
}

/** 'YYYY-MM' of a date, for comparing months. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export function isInRange(iso: string, min?: string, max?: string): boolean {
  return !(min && iso < min) && !(max && iso > max);
}

/** The date moved into [min, max] (both inclusive, both optional). */
export function clampIso(iso: string, min?: string, max?: string): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

/**
 * Six Monday-first weeks covering the month of `iso`. Always six rows, so the calendar keeps
 * the same height from month to month and each grid position always holds a day button.
 */
export function monthWeeks(iso: string): string[][] {
  const first = `${monthOf(iso)}-01`;
  let day = startOfWeek(first);
  const weeks: string[][] = [];
  for (let week = 0; week < 6; week += 1) {
    const days: string[] = [];
    for (let column = 0; column < 7; column += 1) {
      days.push(day);
      day = addDays(day, 1);
    }
    weeks.push(days);
  }
  return weeks;
}

export interface WeekdayName {
  /** Short name for the column heading ("Mon"), or one letter where the short name is long. */
  short: string;
  /** Full name for screen readers ("Monday", "Jumatatu"). */
  long: string;
}

/** Monday-first weekday names in the given locale. */
export function weekdayNames(locale: string): WeekdayName[] {
  const short = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const narrow = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const long = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 1 + index);
    const shortName = short.format(date);
    // Kiswahili's "short" weekday names are the full words (Jumatatu), too wide for a column.
    return { short: shortName.length <= 4 ? shortName : narrow.format(date), long: long.format(date) };
  });
}

/** Formats a YYYY-MM-DD string with the given Intl options, in local time. */
export function formatIso(iso: string, locale: string, options: Intl.DateTimeFormatOptions): string {
  const date = fromIso(iso);
  return date ? new Intl.DateTimeFormat(locale, options).format(date) : iso;
}

/** Trigger text: "Thu, 19 Nov 2026". */
export const TRIGGER_DATE_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };

/** Calendar heading: "November 2026". */
export const MONTH_HEADING_FORMAT: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };

/** Day button name for screen readers: "Thursday, 19 November 2026". */
export const DAY_LABEL_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
