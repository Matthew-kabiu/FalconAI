//! Calendar-event rules: something the farmer puts on the farm calendar
//! themselves ("buy seed at the agrovet", "extension officer visit"), with an
//! optional time and an optional link to one of their crops.
//!
//! Same approach as `activity.rs`: "parse, don't validate" types and every
//! failing field reported together in one [`CoreError::Fields`].
//!
//! Dates and times are Kenya's (EAT, UTC+3, no daylight saving): `date` is a
//! calendar day and `time` a wall-clock `HH:MM`, both with no time zone. The
//! caller supplies "today" (Kenya date in `falcon-api`). Whether a linked
//! crop cycle is the caller's is a database question, answered in
//! `falcon-api`.

use chrono::{Days, NaiveDate, NaiveTime, Timelike};

use crate::error::{CoreError, FieldIssue, IssueCode, Issues};
use crate::text;

/// Longest title, after trimming.
pub const TITLE_MAX_CHARS: usize = 120;
/// Longest description, after trimming.
pub const DESCRIPTION_MAX_CHARS: usize = 1000;
/// Longest notes, after trimming.
pub const NOTES_MAX_CHARS: usize = 500;
/// `date` may be at most this many days after today. It may not be before
/// today: farmers plan events, they do not back-date them.
pub const DATE_MAX_DAYS_AFTER_TODAY: u64 = 365;

/// The raw fields of a new event, as the client sent them.
#[derive(Debug, Clone, Copy, Default)]
pub struct EventFields<'a> {
    /// The farmer's own words.
    pub title: &'a str,
    /// What the event is about.
    pub description: Option<&'a str>,
    /// The Kenya date. `None` only in [`Default`]; the API requires it.
    pub date: Option<NaiveDate>,
    /// Optional `HH:MM`, Kenya time.
    pub time: Option<&'a str>,
    /// Free notes.
    pub notes: Option<&'a str>,
}

/// A valid new event. The crop link is not here: it is a reference the API
/// checks against the database, not a rule.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewEvent {
    title: String,
    description: Option<String>,
    date: NaiveDate,
    time: Option<NaiveTime>,
    notes: Option<String>,
}

impl NewEvent {
    /// Checks every field of a new event, as of `today`.
    ///
    /// - `title`: required, 1 to 120 characters after trimming.
    /// - `description`: optional, up to 1000 characters; blank becomes `None`.
    /// - `date`: from `today` to 365 days after, both included
    ///   (`out_of_range` otherwise).
    /// - `time`: optional, exactly `HH:MM` from `00:00` to `23:59`
    ///   (`invalid_choice` otherwise).
    /// - `notes`: optional, up to 500 characters; blank becomes `None`.
    ///
    /// # Errors
    /// [`CoreError::Fields`] listing every failing field.
    pub fn parse(fields: &EventFields<'_>, today: NaiveDate) -> Result<Self, CoreError> {
        let mut issues = Issues::default();
        let title = issues.check(parse_title(fields.title));
        let description = issues.check(parse_description(fields.description));
        let date = issues.check(
            fields
                .date
                .ok_or_else(|| FieldIssue::new("date", IssueCode::Required))
                .and_then(|d| parse_date(d, today)),
        );
        let time = issues.check(fields.time.map(parse_time).transpose());
        let notes = issues.check(parse_notes(fields.notes));

        if let (Some(title), Some(description), Some(date), Some(time), Some(notes)) =
            (title, description, date, time, notes)
        {
            return Ok(Self {
                title,
                description,
                date,
                time,
                notes,
            });
        }
        Err(issues.into_error())
    }

    /// The trimmed title.
    #[must_use]
    pub fn title(&self) -> &str {
        &self.title
    }

    /// The trimmed description, or `None`.
    #[must_use]
    pub fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    /// The Kenya date.
    #[must_use]
    pub fn date(&self) -> NaiveDate {
        self.date
    }

    /// The Kenya time (whole minutes), or `None`.
    #[must_use]
    pub fn time(&self) -> Option<NaiveTime> {
        self.time
    }

    /// The trimmed notes, or `None`.
    #[must_use]
    pub fn notes(&self) -> Option<&str> {
        self.notes.as_deref()
    }
}

/// The raw fields of an event update. For each field the outer `Option` is
/// "was it sent"; for optional fields the inner one is "set or clear".
#[derive(Debug, Clone, Copy, Default)]
pub struct EventPatchFields<'a> {
    /// New title.
    pub title: Option<&'a str>,
    /// New description, or clear.
    pub description: Option<Option<&'a str>>,
    /// New date.
    pub date: Option<NaiveDate>,
    /// New time, or clear.
    pub time: Option<Option<&'a str>>,
    /// New notes, or clear.
    pub notes: Option<Option<&'a str>>,
}

/// A valid partial update of an event. `None` means "leave as is".
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct EventChanges {
    title: Option<String>,
    description: Option<Option<String>>,
    date: Option<NaiveDate>,
    time: Option<Option<NaiveTime>>,
    notes: Option<Option<String>>,
}

impl EventChanges {
    /// Checks the sent fields with the same rules as [`NewEvent::parse`].
    /// Only a sent `date` is checked against `today`, so an event already in
    /// the past can still have its other fields edited.
    ///
    /// # Errors
    /// [`CoreError::Fields`] listing every failing field.
    pub fn parse(fields: &EventPatchFields<'_>, today: NaiveDate) -> Result<Self, CoreError> {
        let mut issues = Issues::default();
        // `transpose`: Option<Result<T, E>> → Result<Option<T>, E>, so a field
        // that was not sent is fine and only a sent value can fail.
        let title = issues.check(fields.title.map(parse_title).transpose());
        let description = issues.check(fields.description.map(parse_description).transpose());
        let date = issues.check(fields.date.map(|d| parse_date(d, today)).transpose());
        // Two layers: Some(None) (sent as null) clears, Some(Some(x)) is checked.
        let time = issues.check(
            fields
                .time
                .map(|t| t.map(parse_time).transpose())
                .transpose(),
        );
        let notes = issues.check(fields.notes.map(parse_notes).transpose());

        if let (Some(title), Some(description), Some(date), Some(time), Some(notes)) =
            (title, description, date, time, notes)
        {
            return Ok(Self {
                title,
                description,
                date,
                time,
                notes,
            });
        }
        Err(issues.into_error())
    }

    /// The new title, if it changes.
    #[must_use]
    pub fn title(&self) -> Option<&str> {
        self.title.as_deref()
    }

    /// `None`: leave. `Some(None)`: clear. `Some(Some(x))`: set.
    #[must_use]
    pub fn description(&self) -> Option<Option<&str>> {
        self.description.as_ref().map(Option::as_deref)
    }

    /// The new date, if it changes.
    #[must_use]
    pub fn date(&self) -> Option<NaiveDate> {
        self.date
    }

    /// `None`: leave. `Some(None)`: clear. `Some(Some(x))`: set.
    #[must_use]
    pub fn time(&self) -> Option<Option<NaiveTime>> {
        self.time
    }

    /// `None`: leave. `Some(None)`: clear. `Some(Some(x))`: set.
    #[must_use]
    pub fn notes(&self) -> Option<Option<&str>> {
        self.notes.as_ref().map(Option::as_deref)
    }
}

/// The wire form of an event time: `HH:MM` (seconds are never stored).
#[must_use]
pub fn format_time(time: NaiveTime) -> String {
    format!("{:02}:{:02}", time.hour(), time.minute())
}

fn parse_title(input: &str) -> Result<String, FieldIssue> {
    text::required("title", input, TITLE_MAX_CHARS)
}

fn parse_description(input: Option<&str>) -> Result<Option<String>, FieldIssue> {
    text::optional("description", input, DESCRIPTION_MAX_CHARS)
}

fn parse_notes(input: Option<&str>) -> Result<Option<String>, FieldIssue> {
    text::optional("notes", input, NOTES_MAX_CHARS)
}

fn parse_date(date: NaiveDate, today: NaiveDate) -> Result<NaiveDate, FieldIssue> {
    let latest = today.checked_add_days(Days::new(DATE_MAX_DAYS_AFTER_TODAY));
    // `None` only at chrono's date limits; then there is no upper bound.
    if date < today || latest.is_some_and(|l| date > l) {
        return Err(FieldIssue::new("date", IssueCode::OutOfRange));
    }
    Ok(date)
}

/// Exactly `HH:MM`, two digits each, `00:00` to `23:59`. Anything else
/// (`9:30`, `09:30:00`, `24:00`, `noon`) is `invalid_choice`: the value is
/// not one of the allowed times of day.
fn parse_time(input: &str) -> Result<NaiveTime, FieldIssue> {
    let invalid = || FieldIssue::new("time", IssueCode::InvalidChoice);
    let bytes = input.as_bytes();
    if bytes.len() != 5 || bytes[2] != b':' {
        return Err(invalid());
    }
    let two_digits = |hi: u8, lo: u8| -> Option<u32> {
        (hi.is_ascii_digit() && lo.is_ascii_digit())
            .then(|| u32::from(hi - b'0') * 10 + u32::from(lo - b'0'))
    };
    let hour = two_digits(bytes[0], bytes[1]).ok_or_else(invalid)?;
    let minute = two_digits(bytes[3], bytes[4]).ok_or_else(invalid)?;
    // `from_hms_opt` is `None` for hour > 23 or minute > 59.
    NaiveTime::from_hms_opt(hour, minute, 0).ok_or_else(invalid)
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

    fn hm(h: u32, m: u32) -> NaiveTime {
        NaiveTime::from_hms_opt(h, m, 0).unwrap()
    }

    fn issues_of(err: CoreError) -> Vec<FieldIssue> {
        match err {
            CoreError::Fields(issues) => issues,
            other => panic!("expected CoreError::Fields, got {other:?}"),
        }
    }

    fn issue(field: &str, code: IssueCode) -> FieldIssue {
        FieldIssue::new(field, code)
    }

    fn minimal() -> EventFields<'static> {
        EventFields {
            title: "Buy seed",
            date: Some(today()),
            ..EventFields::default()
        }
    }

    fn parse(fields: &EventFields<'_>) -> Result<NewEvent, CoreError> {
        NewEvent::parse(fields, today())
    }

    #[test]
    fn a_minimal_event_is_valid() {
        let e = parse(&minimal()).unwrap();
        assert_eq!(e.title(), "Buy seed");
        assert_eq!(e.description(), None);
        assert_eq!(e.date(), today());
        assert_eq!(e.time(), None);
        assert_eq!(e.notes(), None);
    }

    #[test]
    fn a_full_event_keeps_every_field_trimmed() {
        let fields = EventFields {
            title: "  Extension officer visit ",
            description: Some("  soil test for the maize plot  "),
            date: Some(date(2026, 12, 1)),
            time: Some("09:30"),
            notes: Some("  bring soil sample "),
        };
        let e = parse(&fields).unwrap();
        assert_eq!(e.title(), "Extension officer visit");
        assert_eq!(e.description(), Some("soil test for the maize plot"));
        assert_eq!(e.date(), date(2026, 12, 1));
        assert_eq!(e.time(), Some(hm(9, 30)));
        assert_eq!(e.notes(), Some("bring soil sample"));
    }

    #[test]
    fn title_is_required_and_bounded() {
        let max = "t".repeat(TITLE_MAX_CHARS);
        assert!(parse(&EventFields { title: &max, ..minimal() }).is_ok());
        let accented = "é".repeat(TITLE_MAX_CHARS); // counted in characters
        assert!(parse(&EventFields { title: &accented, ..minimal() }).is_ok());
        for blank in ["", "   ", "\t\n"] {
            assert_eq!(
                issues_of(parse(&EventFields { title: blank, ..minimal() }).unwrap_err()),
                vec![issue("title", IssueCode::Required)],
                "{blank:?}"
            );
        }
        let long = "t".repeat(TITLE_MAX_CHARS + 1);
        assert_eq!(
            issues_of(parse(&EventFields { title: &long, ..minimal() }).unwrap_err()),
            vec![issue("title", IssueCode::TooLong)]
        );
    }

    #[test]
    fn date_is_today_to_a_year_ahead() {
        let latest = today() + Days::new(DATE_MAX_DAYS_AFTER_TODAY);
        for ok in [today(), today() + Days::new(1), latest] {
            let fields = EventFields {
                date: Some(ok),
                ..minimal()
            };
            assert!(parse(&fields).is_ok(), "{ok}");
        }
        let yesterday = today() - Days::new(1);
        for bad in [yesterday, today() - Days::new(365), latest + Days::new(1)] {
            let fields = EventFields {
                date: Some(bad),
                ..minimal()
            };
            assert_eq!(
                issues_of(parse(&fields).unwrap_err()),
                vec![issue("date", IssueCode::OutOfRange)],
                "{bad}"
            );
        }
        let missing = EventFields {
            date: None,
            ..minimal()
        };
        assert_eq!(
            issues_of(parse(&missing).unwrap_err()),
            vec![issue("date", IssueCode::Required)]
        );
    }

    #[test]
    fn time_is_strict_hh_mm() {
        for (raw, expected) in [
            ("00:00", hm(0, 0)),
            ("09:05", hm(9, 5)),
            ("12:30", hm(12, 30)),
            ("23:59", hm(23, 59)),
        ] {
            let fields = EventFields {
                time: Some(raw),
                ..minimal()
            };
            assert_eq!(parse(&fields).unwrap().time(), Some(expected), "{raw}");
        }
        for bad in [
            "", "9:30", "09:3", "24:00", "23:60", "99:99", "09:30:00", "09-30", "0930", " 09:30",
            "noon", "+9:30", "٠٩:٣٠",
        ] {
            let fields = EventFields {
                time: Some(bad),
                ..minimal()
            };
            assert_eq!(
                issues_of(parse(&fields).unwrap_err()),
                vec![issue("time", IssueCode::InvalidChoice)],
                "{bad:?}"
            );
        }
    }

    #[test]
    fn description_is_optional_and_bounded() {
        let max = "d".repeat(DESCRIPTION_MAX_CHARS);
        let fields = EventFields {
            description: Some(&max),
            ..minimal()
        };
        assert_eq!(parse(&fields).unwrap().description(), Some(max.as_str()));
        let accented = "é".repeat(DESCRIPTION_MAX_CHARS); // counted in characters
        let fields = EventFields {
            description: Some(&accented),
            ..minimal()
        };
        assert!(parse(&fields).is_ok());
        for blank in ["", "   ", "\t\n"] {
            let fields = EventFields {
                description: Some(blank),
                ..minimal()
            };
            assert_eq!(parse(&fields).unwrap().description(), None, "{blank:?}");
        }
        let long = "d".repeat(DESCRIPTION_MAX_CHARS + 1);
        let fields = EventFields {
            description: Some(&long),
            ..minimal()
        };
        assert_eq!(
            issues_of(parse(&fields).unwrap_err()),
            vec![issue("description", IssueCode::TooLong)]
        );
    }

    #[test]
    fn notes_are_optional_and_bounded() {
        let max = "n".repeat(NOTES_MAX_CHARS);
        let fields = EventFields {
            notes: Some(&max),
            ..minimal()
        };
        assert_eq!(parse(&fields).unwrap().notes(), Some(max.as_str()));
        for blank in ["", "   "] {
            let fields = EventFields {
                notes: Some(blank),
                ..minimal()
            };
            assert_eq!(parse(&fields).unwrap().notes(), None, "{blank:?}");
        }
        let long = "n".repeat(NOTES_MAX_CHARS + 1);
        let fields = EventFields {
            notes: Some(&long),
            ..minimal()
        };
        assert_eq!(
            issues_of(parse(&fields).unwrap_err()),
            vec![issue("notes", IssueCode::TooLong)]
        );
    }

    #[test]
    fn new_event_reports_every_failing_field() {
        let long = "n".repeat(NOTES_MAX_CHARS + 1);
        let long_description = "d".repeat(DESCRIPTION_MAX_CHARS + 1);
        let fields = EventFields {
            title: " ",
            description: Some(&long_description),
            date: Some(today() - Days::new(1)),
            time: Some("25:00"),
            notes: Some(&long),
        };
        assert_eq!(
            issues_of(parse(&fields).unwrap_err()),
            vec![
                issue("title", IssueCode::Required),
                issue("description", IssueCode::TooLong),
                issue("date", IssueCode::OutOfRange),
                issue("time", IssueCode::InvalidChoice),
                issue("notes", IssueCode::TooLong),
            ]
        );
    }

    fn patch(fields: &EventPatchFields<'_>) -> Result<EventChanges, CoreError> {
        EventChanges::parse(fields, today())
    }

    #[test]
    fn changes_check_only_what_was_sent() {
        assert_eq!(
            patch(&EventPatchFields::default()).unwrap(),
            EventChanges::default()
        );
        let fields = EventPatchFields {
            title: Some(" Spray day "),
            description: Some(Some("  fall armyworm  ")),
            date: Some(today()),
            time: Some(Some("07:00")),
            notes: Some(Some(" ok ")),
        };
        let c = patch(&fields).unwrap();
        assert_eq!(c.title(), Some("Spray day"));
        assert_eq!(c.description(), Some(Some("fall armyworm")));
        assert_eq!(c.date(), Some(today()));
        assert_eq!(c.time(), Some(Some(hm(7, 0))));
        assert_eq!(c.notes(), Some(Some("ok")));
    }

    #[test]
    fn changes_can_clear_description_time_and_notes() {
        let fields = EventPatchFields {
            description: Some(None),
            time: Some(None),
            notes: Some(None),
            ..EventPatchFields::default()
        };
        let c = patch(&fields).unwrap();
        assert_eq!(c.description(), Some(None));
        assert_eq!(c.time(), Some(None));
        assert_eq!(c.notes(), Some(None));
        assert_eq!((c.title(), c.date()), (None, None));
        // Blank description and notes clear too, like on create.
        let blank = EventPatchFields {
            description: Some(Some("  ")),
            notes: Some(Some("  ")),
            ..EventPatchFields::default()
        };
        let c = patch(&blank).unwrap();
        assert_eq!(c.description(), Some(None));
        assert_eq!(c.notes(), Some(None));
        // Not sent: left as is.
        assert_eq!(patch(&EventPatchFields::default()).unwrap().description(), None);
    }

    #[test]
    fn changes_apply_the_same_rules_and_report_every_field() {
        let long = "n".repeat(NOTES_MAX_CHARS + 1);
        let long_description = "d".repeat(DESCRIPTION_MAX_CHARS + 1);
        let fields = EventPatchFields {
            title: Some(""),
            description: Some(Some(&long_description)),
            date: Some(today() - Days::new(1)),
            time: Some(Some("7am")),
            notes: Some(Some(&long)),
        };
        assert_eq!(
            issues_of(patch(&fields).unwrap_err()),
            vec![
                issue("title", IssueCode::Required),
                issue("description", IssueCode::TooLong),
                issue("date", IssueCode::OutOfRange),
                issue("time", IssueCode::InvalidChoice),
                issue("notes", IssueCode::TooLong),
            ]
        );
        let too_far = EventPatchFields {
            date: Some(today() + Days::new(DATE_MAX_DAYS_AFTER_TODAY + 1)),
            ..EventPatchFields::default()
        };
        assert_eq!(
            issues_of(patch(&too_far).unwrap_err()),
            vec![issue("date", IssueCode::OutOfRange)]
        );
    }

    #[test]
    fn times_format_as_hh_mm() {
        assert_eq!(format_time(hm(0, 0)), "00:00");
        assert_eq!(format_time(hm(9, 5)), "09:05");
        assert_eq!(format_time(hm(23, 59)), "23:59");
        // Seconds never reach the wire.
        assert_eq!(
            format_time(NaiveTime::from_hms_opt(7, 30, 45).unwrap()),
            "07:30"
        );
    }
}
