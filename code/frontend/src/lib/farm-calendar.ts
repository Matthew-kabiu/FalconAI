// Turns the whole-farm calendar into what the screens show. Pure functions, no React.
// Dates are Kenya dates ('YYYY-MM-DD'), so plain string comparison orders them.
import type { FarmCalendarEntry } from '@/types/crop';

export type EntryKind = FarmCalendarEntry['kind'];
export const ENTRY_KINDS: readonly EntryKind[] = ['task', 'stage', 'activity', 'event'];

/** Where a day sits relative to today: shown differently, and only today/future take new events. */
export type DayTime = 'past' | 'today' | 'future';
export const dayTime = (day: string, today: string): DayTime => (day < today ? 'past' : day === today ? 'today' : 'future');

/** Stable key for lists. */
export const entryKey = (entry: FarmCalendarEntry) =>
  entry.eventId ?? entry.activityId ?? `${entry.cycleId}-${entry.kind}-${entry.key}-${entry.startsOn}`;

/** Things still ahead or under way (crop stages and tasks, own events), soonest first. */
export function comingUp(entries: readonly FarmCalendarEntry[], today: string): FarmCalendarEntry[] {
  return entries.filter((entry) => entry.kind !== 'activity' && entry.endsOn >= today);
}

/** Logged activities, newest first. */
export function done(entries: readonly FarmCalendarEntry[]): FarmCalendarEntry[] {
  return entries.filter((entry) => entry.kind === 'activity').sort((a, b) => (a.startsOn < b.startsOn ? 1 : a.startsOn > b.startsOn ? -1 : 0));
}

/**
 * What a month-grid cell shows for `day`: tasks and stages on the day they start (a stage
 * lasting weeks would otherwise fill every cell), activities and events on their day.
 * Events with a time come first, in time order.
 */
export function startingOn(entries: readonly FarmCalendarEntry[], day: string): FarmCalendarEntry[] {
  return entries
    .filter((entry) => entry.startsOn === day)
    .sort((a, b) => {
      if (a.kind === 'event' && b.kind === 'event') return (a.time ?? '99') < (b.time ?? '99') ? -1 : 1;
      return ENTRY_KINDS.indexOf(a.kind) - ENTRY_KINDS.indexOf(b.kind);
    });
}

/** Everything that touches `day`, including stages and tasks under way since earlier. */
export function onDay(entries: readonly FarmCalendarEntry[], day: string): FarmCalendarEntry[] {
  return entries.filter((entry) => entry.startsOn <= day && entry.endsOn >= day);
}

/** True when any shown timing is still waiting for an expert's check. */
export const hasUnreviewed = (entries: readonly FarmCalendarEntry[]) =>
  entries.some((entry) => (entry.kind === 'stage' || entry.kind === 'task') && !entry.reviewed);
