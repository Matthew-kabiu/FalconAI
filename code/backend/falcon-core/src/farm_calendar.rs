//! Whole-farm calendar rules: which dates the farm calendar covers, and how
//! its entries are kinded and ordered.
//!
//! The farm calendar merges every open crop's dated stages and tasks (from
//! [`crate::calendar`]) with the activities the farmer logged and the events
//! they put on the calendar themselves ([`crate::event`]), inside one date
//! window. This module decides that window: its defaults (14 days ago to
//! 60 days ahead) and its largest span (180 days), so a phone working offline
//! shows exactly the same window as the server.
//!
//! "Today" is a parameter, never read from a clock here.

use chrono::{Days, NaiveDate};
use serde::Serialize;

/// Without `from`, the window starts this many days before today.
pub const DEFAULT_DAYS_BEFORE_TODAY: u64 = 14;
/// Without `to`, the window ends this many days after today.
pub const DEFAULT_DAYS_AFTER_TODAY: u64 = 60;
/// `to` may be at most this many days after `from` (both days included in
/// the window, so a window holds at most 181 calendar days).
pub const MAX_SPAN_DAYS: i64 = 180;
/// The time zone of every date and time on the farm calendar: Kenya (EAT,
/// UTC+3, no daylight saving). Sent to clients as `timeZone`.
pub const TIME_ZONE: &str = "Africa/Nairobi";

/// Why a requested window was refused. `falcon-api` answers 400: these are
/// query-string mistakes, not a farm record breaking a rule.
#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
pub enum WindowError {
    /// `from` is after `to`.
    #[error("from must be on or before to")]
    FromAfterTo,
    /// `to` is more than [`MAX_SPAN_DAYS`] after `from`.
    #[error("the calendar window may span at most 180 days")]
    TooLong,
}

/// The dates a farm calendar covers, `from` to `to`, both included.
/// Built only by [`Window::resolve`], so it is always valid.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Window {
    from: NaiveDate,
    to: NaiveDate,
}

impl Window {
    /// The window for the requested `from` and `to`. Each one left out takes
    /// its own default (today − 14 days, today + 60 days); the result is then
    /// checked.
    ///
    /// # Errors
    /// [`WindowError::FromAfterTo`] when `from` is after `to`;
    /// [`WindowError::TooLong`] when `to` is more than 180 days after `from`.
    pub fn resolve(
        from: Option<NaiveDate>,
        to: Option<NaiveDate>,
        today: NaiveDate,
    ) -> Result<Self, WindowError> {
        // `unwrap_or_else` runs the default only when the value is missing.
        // The checked date maths saturates at chrono's limits instead of
        // panicking; no real "today" comes near them.
        let from = from.unwrap_or_else(|| {
            today
                .checked_sub_days(Days::new(DEFAULT_DAYS_BEFORE_TODAY))
                .unwrap_or(NaiveDate::MIN)
        });
        let to = to.unwrap_or_else(|| {
            today
                .checked_add_days(Days::new(DEFAULT_DAYS_AFTER_TODAY))
                .unwrap_or(NaiveDate::MAX)
        });
        if from > to {
            return Err(WindowError::FromAfterTo);
        }
        if to.signed_duration_since(from).num_days() > MAX_SPAN_DAYS {
            return Err(WindowError::TooLong);
        }
        Ok(Self { from, to })
    }

    /// First day of the window.
    #[must_use]
    pub fn from(&self) -> NaiveDate {
        self.from
    }

    /// Last day of the window (included).
    #[must_use]
    pub fn to(&self) -> NaiveDate {
        self.to
    }

    /// True when `[starts_on, ends_on]` shares at least one day with the
    /// window (a stage that began before `from` but is still running counts).
    #[must_use]
    pub fn overlaps(&self, starts_on: NaiveDate, ends_on: NaiveDate) -> bool {
        starts_on <= self.to && ends_on >= self.from
    }

    /// True when `day` is inside the window.
    #[must_use]
    pub fn contains(&self, day: NaiveDate) -> bool {
        self.overlaps(day, day)
    }
}

/// What a farm-calendar entry is. Serialised as `stage`, `task`, `activity`
/// or `event`. The declaration order is the sort order for entries on the
/// same day (`derive(Ord)` compares variants in the order written).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum EntryKind {
    /// A growth stage from the crop's sourced table.
    Stage,
    /// A field task from the crop's sourced table.
    Task,
    /// Something the farmer logged.
    Activity,
    /// Something the farmer put on the calendar themselves.
    Event,
}

impl EntryKind {
    /// The wire name, e.g. `stage`.
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Stage => "stage",
            Self::Task => "task",
            Self::Activity => "activity",
            Self::Event => "event",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn date(y: i32, m: u32, d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    fn today() -> NaiveDate {
        date(2026, 11, 19)
    }

    #[test]
    fn defaults_are_14_days_back_and_60_ahead() {
        let w = Window::resolve(None, None, today()).unwrap();
        assert_eq!(w.from(), date(2026, 11, 5));
        assert_eq!(w.to(), date(2027, 1, 18)); // crosses the year end
    }

    #[test]
    fn each_missing_end_takes_its_own_default() {
        let w = Window::resolve(Some(date(2026, 11, 1)), None, today()).unwrap();
        assert_eq!((w.from(), w.to()), (date(2026, 11, 1), date(2027, 1, 18)));
        let w = Window::resolve(None, Some(date(2026, 12, 1)), today()).unwrap();
        assert_eq!((w.from(), w.to()), (date(2026, 11, 5), date(2026, 12, 1)));
    }

    #[test]
    fn explicit_dates_are_kept_and_one_day_is_allowed() {
        let day = date(2026, 3, 1);
        let w = Window::resolve(Some(day), Some(day), today()).unwrap();
        assert_eq!((w.from(), w.to()), (day, day));
    }

    #[test]
    fn from_after_to_is_refused() {
        assert_eq!(
            Window::resolve(Some(date(2026, 11, 20)), Some(date(2026, 11, 19)), today()),
            Err(WindowError::FromAfterTo)
        );
        // A `from` after the default `to` is refused the same way.
        assert_eq!(
            Window::resolve(Some(date(2027, 6, 1)), None, today()),
            Err(WindowError::FromAfterTo)
        );
    }

    #[test]
    fn span_is_at_most_180_days() {
        let from = date(2026, 1, 1);
        let ok = Window::resolve(Some(from), Some(from + Days::new(180)), today());
        assert!(ok.is_ok());
        assert_eq!(
            Window::resolve(Some(from), Some(from + Days::new(181)), today()),
            Err(WindowError::TooLong)
        );
        // A `from` far before the default `to` is too long as well.
        assert_eq!(
            Window::resolve(Some(date(2020, 1, 1)), None, today()),
            Err(WindowError::TooLong)
        );
    }

    #[test]
    fn overlap_includes_both_ends() {
        let w = Window::resolve(Some(date(2026, 3, 10)), Some(date(2026, 3, 20)), today()).unwrap();
        assert!(w.overlaps(date(2026, 3, 1), date(2026, 3, 10))); // ends on `from`
        assert!(w.overlaps(date(2026, 3, 20), date(2026, 3, 30))); // starts on `to`
        assert!(w.overlaps(date(2026, 3, 1), date(2026, 3, 30))); // covers the window
        assert!(!w.overlaps(date(2026, 3, 1), date(2026, 3, 9)));
        assert!(!w.overlaps(date(2026, 3, 21), date(2026, 3, 30)));
        assert!(w.contains(date(2026, 3, 10)));
        assert!(w.contains(date(2026, 3, 20)));
        assert!(!w.contains(date(2026, 3, 21)));
    }

    #[test]
    fn kinds_sort_stage_task_activity_event_and_have_wire_names() {
        let mut kinds = [
            EntryKind::Event,
            EntryKind::Activity,
            EntryKind::Stage,
            EntryKind::Task,
        ];
        kinds.sort();
        assert_eq!(
            kinds,
            [
                EntryKind::Stage,
                EntryKind::Task,
                EntryKind::Activity,
                EntryKind::Event
            ]
        );
        assert_eq!(EntryKind::Stage.as_str(), "stage");
        assert_eq!(EntryKind::Task.as_str(), "task");
        assert_eq!(EntryKind::Activity.as_str(), "activity");
        assert_eq!(EntryKind::Event.as_str(), "event");
        assert_eq!(TIME_ZONE, "Africa/Nairobi");
    }
}
