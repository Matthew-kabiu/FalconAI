// Rules for the farmer's own calendar events. Mirrors falcon-core/src/event.rs:
// a title (1-120), an optional description (up to 1000), a Kenya date from today up to
// a year ahead (no events on past dates, Matt 2026-11-19), all day or an HH:MM Kenya
// time, and notes up to 500.
import { z } from 'zod';
import { addDays } from '@/components/ui/date-picker';
import { kenyaToday } from '@/lib/kenya-time';
import type { MessageKey } from '@/lib/i18n';
import type { FieldIssue } from '@/types/api';
import type { FarmEventInput } from '@/types/crop';

export const EVENT_TITLE_MAX = 120;
export const EVENT_DESCRIPTION_MAX = 1000;
export const EVENT_NOTES_MAX = 500;
export const EVENT_DAYS_AHEAD = 365;

const key = (messageKey: MessageKey) => messageKey;

/** Dates an event may be put on: today (Kenya) to a year ahead. */
export const eventDateRange = () => {
  const today = kenyaToday();
  return { min: today, max: addDays(today, EVENT_DAYS_AHEAD) };
};

export interface EventFormValues {
  title: string;
  description: string;
  date: string;
  /** 'yes' when the event lasts all day (no time), '' otherwise. */
  allDay: string;
  time: string;
  notes: string;
}

/** `keepDate` lets an existing event that is already in the past keep its own date. */
export function eventSchema(keepDate?: string) {
  const { min, max } = eventDateRange();
  return z
    .object({
      title: z.string().trim().min(1, key('event.issue.titleRequired')).max(EVENT_TITLE_MAX, key('event.issue.titleTooLong')),
      description: z.string().trim().max(EVENT_DESCRIPTION_MAX, key('event.issue.descriptionTooLong')),
      date: z
        .string()
        .min(1, key('event.issue.dateRequired'))
        .refine((value) => value === keepDate || (value >= min && value <= max), key('event.issue.datePast')),
      allDay: z.string(),
      time: z.string().trim(),
      notes: z.string().trim().max(EVENT_NOTES_MAX, key('event.issue.notesTooLong')),
    })
    .superRefine((value, ctx) => {
      if (value.allDay) return;
      if (!value.time) ctx.addIssue({ code: 'custom', path: ['time'], message: key('event.issue.timeRequired') });
      else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time))
        ctx.addIssue({ code: 'custom', path: ['time'], message: key('event.issue.time') });
    })
    .transform(
      (value): FarmEventInput => ({
        title: value.title,
        description: value.description || null,
        date: value.date,
        time: value.allDay ? null : value.time,
        notes: value.notes || null,
      }),
    );
}

const SERVER_MESSAGES: Partial<Record<string, Partial<Record<FieldIssue['code'], MessageKey>>>> = {
  title: { required: 'event.issue.titleRequired', too_long: 'event.issue.titleTooLong' },
  description: { too_long: 'event.issue.descriptionTooLong' },
  date: { required: 'event.issue.dateRequired', out_of_range: 'event.issue.datePast' },
  time: { invalid_choice: 'event.issue.time', out_of_range: 'event.issue.time' },
  notes: { too_long: 'event.issue.notesTooLong' },
};

export function eventServerIssues(issues: readonly FieldIssue[]): Partial<Record<keyof EventFormValues, MessageKey>> {
  const errors: Partial<Record<string, MessageKey>> = {};
  for (const { field, code } of issues) errors[field] ??= SERVER_MESSAGES[field]?.[code] ?? 'error.validation';
  return errors as Partial<Record<keyof EventFormValues, MessageKey>>;
}
