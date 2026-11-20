//! The crop-calendar engine: turns a crop's stage and task tables (days after
//! planting) into real dates for one crop cycle, and finds today's stage.
//!
//! The engine holds no timings. The tables are data, kept in one place,
//! `calendar_data.rs`, each with its `source` and a `reviewed` flag.
//! VISION.md: a calendar is shown only where its timings come from a
//! published Kenyan reference, marked for agricultural review. Every
//! catalogue crop now has a loaded, sourced table, each still
//! `reviewed: false` until an agricultural professional checks it;
//! [`for_crop`] returns `None` only for [`Crop::Other`].
//!
//! Tasks are field work (`first_weeding`, `top_dressing`, `harvest`), never a
//! chemical dose: Falcon AI never prescribes pesticide amounts.
//!
//! "Today" is a parameter, never read from a clock here, so the same code
//! runs on a phone offline and in tests with a fixed date.

use chrono::{Days, NaiveDate};
use serde::{Serialize, Serializer};

use crate::calendar_data;
use crate::crop::Crop;

/// One row of a stage or task table: `key` runs from `start_day` to
/// `end_day` after planting, both included. Day 0 is the planting day.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Span {
    /// Stage key (`emergence`, `flowering`) or task key (`first_weeding`).
    /// Clients translate it.
    pub key: &'static str,
    /// First day, counted from planting.
    pub start_day: u16,
    /// Last day, counted from planting (included).
    pub end_day: u16,
}

impl Span {
    /// A table row. `const` so tables can be `static` data.
    #[must_use]
    pub const fn new(key: &'static str, start_day: u16, end_day: u16) -> Self {
        Self {
            key,
            start_day,
            end_day,
        }
    }
}

/// One crop's calendar data, as written in `calendar_data.rs`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CalendarTable {
    /// Short citation of the published reference the timings come from.
    pub source: &'static str,
    /// False until an agricultural professional has checked the timings.
    pub reviewed: bool,
    /// Growth stages, in order of `start_day`.
    pub stages: &'static [Span],
    /// Field tasks, in order of `start_day`.
    pub tasks: &'static [Span],
}

/// A stage or task with its real dates (`CalendarStage` / `CalendarTask`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatedSpan {
    /// Stage or task key.
    pub key: &'static str,
    /// Days after planting, from the source.
    pub start_day: u16,
    /// Last day after planting (included).
    pub end_day: u16,
    /// Planting date plus `start_day`.
    #[serde(serialize_with = "iso_date")]
    pub starts_on: NaiveDate,
    /// Planting date plus `end_day`.
    #[serde(serialize_with = "iso_date")]
    pub ends_on: NaiveDate,
}

/// One crop cycle's calendar (`CropCalendar` in the contract).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CropCalendar {
    /// Growth stages with dates.
    pub stages: Vec<DatedSpan>,
    /// Field tasks with dates.
    pub tasks: Vec<DatedSpan>,
    /// Key of today's stage; `None` before planting or after the last stage.
    pub current_stage: Option<&'static str>,
    /// Where the timings come from.
    pub source: &'static str,
    /// False until an agricultural professional has checked the timings.
    pub reviewed: bool,
}

/// The calendar of a crop planted on `planted_on`, seen on `today`.
///
/// `None` when the crop has no approved, sourced table, and always for
/// [`Crop::Other`] (a crop the farmer names has no source).
#[must_use]
pub fn for_crop(crop: Crop, planted_on: NaiveDate, today: NaiveDate) -> Option<CropCalendar> {
    if crop == Crop::Other {
        return None;
    }
    calendar_data::table_for(crop).map(|table| build(table, planted_on, today))
}

/// The engine: dates every stage and task of `table` from `planted_on`, and
/// picks the stage that contains `today`.
///
/// When stages overlap, the later one in the table wins (a crop that is
/// already flowering is described as flowering, not as still vegetative).
#[must_use]
pub fn build(table: &CalendarTable, planted_on: NaiveDate, today: NaiveDate) -> CropCalendar {
    let dated = |span: &Span| DatedSpan {
        key: span.key,
        start_day: span.start_day,
        end_day: span.end_day,
        starts_on: add_days(planted_on, span.start_day),
        ends_on: add_days(planted_on, span.end_day),
    };
    let stages: Vec<DatedSpan> = table.stages.iter().map(dated).collect();
    let tasks: Vec<DatedSpan> = table.tasks.iter().map(dated).collect();
    // `rev()` walks from the last stage back, so in an overlap the later stage is found first.
    let current_stage = stages
        .iter()
        .rev()
        .find(|s| s.starts_on <= today && today <= s.ends_on)
        .map(|s| s.key);
    CropCalendar {
        stages,
        tasks,
        current_stage,
        source: table.source,
        reviewed: table.reviewed,
    }
}

/// Checks a table is well formed: a source is named, every key is set, every
/// span ends on or after its start, and rows are in `start_day` order. Used
/// by the tests in `calendar_data.rs`, so a typo in new data fails the build's
/// tests instead of reaching a farmer.
///
/// # Errors
/// A description of the first problem found.
pub fn check_table(table: &CalendarTable) -> Result<(), String> {
    if table.source.trim().is_empty() {
        return Err("source is empty".into());
    }
    for (name, rows) in [("stages", table.stages), ("tasks", table.tasks)] {
        for row in rows {
            if row.key.trim().is_empty() {
                return Err(format!("{name}: a key is empty"));
            }
            if row.end_day < row.start_day {
                return Err(format!("{name}: {} ends before it starts", row.key));
            }
        }
        // `windows(2)` yields each pair of neighbours: [a, b], [b, c], …
        if rows.windows(2).any(|pair| pair[1].start_day < pair[0].start_day) {
            return Err(format!("{name}: rows are not in start_day order"));
        }
    }
    if table.stages.is_empty() {
        return Err("stages: none listed".into());
    }
    Ok(())
}

/// `planted_on + days`. Saturates at chrono's last date instead of failing:
/// a table holds at most `u16::MAX` days, so this never happens for a
/// planting date the crop-cycle rules accept.
fn add_days(planted_on: NaiveDate, days: u16) -> NaiveDate {
    planted_on
        .checked_add_days(Days::new(u64::from(days)))
        .unwrap_or(NaiveDate::MAX)
}

/// Writes a date as `2026-11-19` (the contract's `format: date`).
///
/// chrono's own serde support is an optional feature this crate does not
/// switch on; `NaiveDate`'s `Display` already prints ISO 8601, so
/// `collect_str` is enough.
///
/// # Errors
/// The serializer's error.
pub fn iso_date<S: Serializer>(date: &NaiveDate, serializer: S) -> Result<S::Ok, S::Error> {
    serializer.collect_str(date)
}

#[cfg(test)]
mod tests {
    use super::*;

    // FAKE, TEST-ONLY tables. These numbers are made up to exercise the
    // engine and describe no real crop. Real timings live in
    // calendar_data.rs, only after Matt approves a sourced research file.
    static FAKE_STAGES: [Span; 3] = [
        Span::new("fake_stage_a", 0, 9),
        Span::new("fake_stage_b", 10, 19),
        Span::new("fake_stage_c", 15, 30),
    ];
    static FAKE_TASKS: [Span; 2] = [
        Span::new("fake_task_x", 5, 7),
        Span::new("fake_task_y", 30, 30),
    ];
    static FAKE: CalendarTable = CalendarTable {
        source: "test fixture, not a real source",
        reviewed: false,
        stages: &FAKE_STAGES,
        tasks: &FAKE_TASKS,
    };

    fn date(y: i32, m: u32, d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    #[test]
    fn stages_and_tasks_get_dates_from_the_planting_day() {
        let cal = build(&FAKE, date(2026, 3, 1), date(2026, 3, 1));
        assert_eq!(cal.stages.len(), 3);
        assert_eq!(cal.stages[0].starts_on, date(2026, 3, 1)); // day 0 = planting day
        assert_eq!(cal.stages[0].ends_on, date(2026, 3, 10));
        assert_eq!(cal.stages[2].starts_on, date(2026, 3, 16));
        assert_eq!(cal.stages[2].ends_on, date(2026, 3, 31));
        assert_eq!(cal.tasks[0].starts_on, date(2026, 3, 6));
        assert_eq!(cal.tasks[1].starts_on, cal.tasks[1].ends_on);
        assert_eq!(cal.source, FAKE.source);
        assert!(!cal.reviewed);
    }

    #[test]
    fn dates_cross_month_and_leap_day() {
        let cal = build(&FAKE, date(2028, 2, 20), date(2028, 2, 20));
        assert_eq!(cal.stages[0].ends_on, date(2028, 2, 29)); // 2028 is a leap year
        assert_eq!(cal.stages[1].starts_on, date(2028, 3, 1));
    }

    #[test]
    fn current_stage_follows_today() {
        let planted = date(2026, 3, 1);
        let at = |day: u64| build(&FAKE, planted, planted + Days::new(day)).current_stage;
        assert_eq!(at(0), Some("fake_stage_a"));
        assert_eq!(at(9), Some("fake_stage_a")); // end day is included
        assert_eq!(at(10), Some("fake_stage_b"));
        assert_eq!(at(15), Some("fake_stage_c")); // overlap: the later stage wins
        assert_eq!(at(30), Some("fake_stage_c"));
        assert_eq!(at(31), None); // after the last stage
    }

    #[test]
    fn no_current_stage_before_planting() {
        let planted = date(2026, 3, 1);
        let cal = build(&FAKE, planted, date(2026, 2, 28));
        assert_eq!(cal.current_stage, None);
        assert_eq!(cal.stages[0].starts_on, planted); // dates are still computed
    }

    #[test]
    fn a_gap_between_stages_has_no_current_stage() {
        static GAPPY_STAGES: [Span; 2] = [Span::new("a", 0, 4), Span::new("b", 10, 12)];
        let gappy = CalendarTable {
            stages: &GAPPY_STAGES,
            tasks: &[],
            ..FAKE
        };
        let planted = date(2026, 1, 1);
        assert_eq!(build(&gappy, planted, date(2026, 1, 7)).current_stage, None);
    }

    #[test]
    fn check_table_accepts_the_fake_and_refuses_bad_rows() {
        assert_eq!(check_table(&FAKE), Ok(()));

        let no_source = CalendarTable { source: " ", ..FAKE };
        assert!(check_table(&no_source).is_err());

        static BACKWARDS: [Span; 1] = [Span::new("a", 5, 4)];
        let backwards = CalendarTable {
            stages: &BACKWARDS,
            ..FAKE
        };
        assert!(check_table(&backwards).is_err());

        static UNORDERED: [Span; 2] = [Span::new("a", 10, 20), Span::new("b", 0, 5)];
        let unordered = CalendarTable {
            tasks: &UNORDERED,
            ..FAKE
        };
        assert!(check_table(&unordered).is_err());

        let empty = CalendarTable {
            stages: &[],
            ..FAKE
        };
        assert!(check_table(&empty).is_err());
    }

    #[test]
    fn every_catalogue_crop_has_a_calendar_and_other_never_does() {
        let today = date(2026, 11, 19);
        for row in crate::crop::CATALOGUE {
            let cal = for_crop(row.crop, today, today);
            if row.crop == Crop::Other {
                assert_eq!(cal, None);
            } else {
                assert!(cal.is_some(), "{:?} has no table", row.crop);
            }
        }
    }
}
