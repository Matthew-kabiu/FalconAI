// Display formatting for dates and money, in the active language. One place, so every
// screen writes "12 Mar" and "KES 1,850" the same way.
import type { Language } from '@/lib/i18n';

const LOCALES: Record<Language, string> = { en: 'en-KE', sw: 'sw-KE' };

/** "12 Mar" / "12 Mac". `iso` is a calendar date, YYYY-MM-DD. */
export function formatDay(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(LOCALES[language], { day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`));
}

/** "Wednesday, 19 November". */
export function formatLongDate(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(LOCALES[language], { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

/** "KES 1,850" (whole shillings). */
export function formatKes(amount: number, language: Language): string {
  return `KES ${new Intl.NumberFormat(LOCALES[language], { maximumFractionDigits: 0 }).format(amount)}`;
}

/** Whole days from today to `iso` (0 = today, 1 = tomorrow, negative = past). */
export function daysFromToday(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
}

/** Calendar date `offset` days from today, as YYYY-MM-DD (local time). */
export function isoDayFromToday(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
