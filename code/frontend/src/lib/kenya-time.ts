// Falcon AI keeps every date and time in Kenya time (Matt, 2026-11-19):
// East Africa Time, UTC+3, no daylight saving. The API agrees (platform/clock.rs,
// FarmCalendar.timeZone). Use these instead of the phone's own clock zone.
export const KENYA_TIME_ZONE = 'Africa/Nairobi';

/** Today's date in Kenya, 'YYYY-MM-DD', whatever zone the phone is set to. */
export function kenyaToday(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: KENYA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(),
  );
}
