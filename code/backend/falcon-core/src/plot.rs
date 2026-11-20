//! Plot rules: a plot is a named piece of a farm with a size, a size unit and
//! optional notes (soil, slope, history).
//!
//! Same approach as `farm.rs`: "parse, don't validate" types, and every
//! failing field is reported together in one [`CoreError::Fields`].
//!
//! Size is kept to 2 decimal places and handled as whole hundredths
//! (0.5 acres = 50). Floats cannot hold most decimals exactly (0.1 + 0.2 is
//! 0.30000000000000004 in Rust exactly as in JavaScript), so the number is
//! rounded once, here, and stored as an integer.

use serde::Serialize;

use crate::error::{CoreError, FieldIssue, IssueCode, Issues};
use crate::text;

/// Longest plot name, in characters, after trimming.
pub const NAME_MAX_CHARS: usize = 80;
/// Longest notes, in characters, after trimming.
pub const NOTES_MAX_CHARS: usize = 500;

/// The unit a plot's size is given in. Serialised as `acres`, `hectares` or
/// `plots_50x100`.
///
/// `plots_50x100` is the measure most Kenyans use for small plots: a plot of
/// 50 by 100 feet (about 0.11 acres). The size is HOW MANY such plots, so a
/// "50 by 100" is 1 and a "100 by 100" is 2. Kept as its own unit, not
/// converted to acres, so the farmer sees the size the way they said it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SizeUnit {
    /// Acres, the unit most Kenyan farmers use.
    Acres,
    /// Hectares.
    Hectares,
    /// Number of 50 by 100 ft plots (Matt, 2026-11-19).
    #[serde(rename = "plots_50x100")]
    Plots50x100,
}

impl SizeUnit {
    /// The wire name, `acres`, `hectares` or `plots_50x100`.
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Acres => "acres",
            Self::Hectares => "hectares",
            Self::Plots50x100 => "plots_50x100",
        }
    }

    /// Parses `acres`, `hectares` or `plots_50x100` (exact, lowercase). `None`
    /// for anything else.
    #[must_use]
    pub fn from_slug(slug: &str) -> Option<Self> {
        match slug {
            "acres" => Some(Self::Acres),
            "hectares" => Some(Self::Hectares),
            "plots_50x100" => Some(Self::Plots50x100),
            _ => None,
        }
    }

    /// Parses the `sizeUnit` input field.
    ///
    /// # Errors
    /// `sizeUnit: invalid_choice` for anything but the three units above.
    pub fn parse_field(slug: &str) -> Result<Self, FieldIssue> {
        Self::from_slug(slug).ok_or_else(|| FieldIssue::new("sizeUnit", IssueCode::InvalidChoice))
    }
}

/// A plot size: greater than 0 and at most 1000, to 2 decimal places.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PlotSize(i32);

impl PlotSize {
    /// Largest size, in units.
    pub const MAX: f64 = 1000.0;
    /// Hundredths in one unit: the stored integer is the size times this.
    pub const HUNDREDTHS_PER_UNIT: i32 = 100;

    /// Checks a size and rounds it to 2 decimal places (half away from zero).
    ///
    /// # Errors
    /// `size: out_of_range` when the size is not a finite number above 0 and
    /// at most 1000, or rounds to 0.00 (e.g. 0.004).
    pub fn parse(value: f64) -> Result<Self, FieldIssue> {
        let out_of_range = || FieldIssue::new("size", IssueCode::OutOfRange);
        // `is_finite` also refuses NaN and infinity, which JSON cannot send but
        // a future caller (the mobile app) could.
        if !value.is_finite() || value <= 0.0 || value > Self::MAX {
            return Err(out_of_range());
        }
        let hundredths = (value * f64::from(Self::HUNDREDTHS_PER_UNIT)).round();
        // `as` from f64 to i32 saturates instead of wrapping; the value is
        // already a whole number within 0..=100_000 here, so nothing is lost.
        let hundredths = hundredths as i32;
        if hundredths == 0 {
            return Err(out_of_range());
        }
        Ok(Self(hundredths))
    }

    /// The size in whole hundredths, as stored (0.5 → 50).
    #[must_use]
    pub fn hundredths(self) -> i32 {
        self.0
    }

    /// The size as a number, e.g. `0.5`.
    #[must_use]
    pub fn value(self) -> f64 {
        Self::value_of_hundredths(self.0)
    }

    /// Turns a stored hundredths value back into the number sent to clients.
    #[must_use]
    pub fn value_of_hundredths(hundredths: i32) -> f64 {
        f64::from(hundredths) / f64::from(Self::HUNDREDTHS_PER_UNIT)
    }
}

/// A valid new plot.
#[derive(Debug, Clone, PartialEq)]
pub struct NewPlot {
    name: String,
    size: PlotSize,
    size_unit: SizeUnit,
    notes: Option<String>,
}

impl NewPlot {
    /// Checks every field of a new plot.
    ///
    /// - `name`: trimmed, 1 to 80 characters.
    /// - `size`: greater than 0, at most 1000, rounded to 2 decimal places.
    /// - `sizeUnit`: `acres` or `hectares`.
    /// - `notes`: optional, trimmed, up to 500 characters; empty becomes `None`.
    ///
    /// # Errors
    /// [`CoreError::Fields`] listing every failing field.
    pub fn parse(
        name: &str,
        size: f64,
        size_unit: &str,
        notes: Option<&str>,
    ) -> Result<Self, CoreError> {
        let mut issues = Issues::default();
        let name = issues.check(parse_name(name));
        let size = issues.check(PlotSize::parse(size));
        let size_unit = issues.check(SizeUnit::parse_field(size_unit));
        let notes = issues.check(parse_notes(notes));

        if let (Some(name), Some(size), Some(size_unit), Some(notes)) =
            (name, size, size_unit, notes)
        {
            return Ok(Self {
                name,
                size,
                size_unit,
                notes,
            });
        }
        Err(issues.into_error())
    }

    /// The trimmed name.
    #[must_use]
    pub fn name(&self) -> &str {
        &self.name
    }

    /// The size, rounded to 2 decimal places.
    #[must_use]
    pub fn size(&self) -> PlotSize {
        self.size
    }

    /// The size unit.
    #[must_use]
    pub fn size_unit(&self) -> SizeUnit {
        self.size_unit
    }

    /// The trimmed notes, or `None`.
    #[must_use]
    pub fn notes(&self) -> Option<&str> {
        self.notes.as_deref()
    }
}

/// A valid partial update of a plot. `None` means "leave as is".
#[derive(Debug, Clone, PartialEq, Default)]
pub struct PlotChanges {
    name: Option<String>,
    size: Option<PlotSize>,
    size_unit: Option<SizeUnit>,
    // Outer Option: was `notes` sent. Inner Option: set or clear.
    notes: Option<Option<String>>,
}

impl PlotChanges {
    /// Checks the fields of a partial update with the same rules as
    /// [`NewPlot::parse`]. Only fields that are `Some` are checked. For
    /// `notes`, `Some(None)` (sent as null) and `Some(Some(""))` both clear them.
    ///
    /// # Errors
    /// [`CoreError::Fields`] listing every failing field.
    pub fn parse(
        name: Option<&str>,
        size: Option<f64>,
        size_unit: Option<&str>,
        notes: Option<Option<&str>>,
    ) -> Result<Self, CoreError> {
        let mut issues = Issues::default();
        // `transpose`: Option<Result<T, E>> → Result<Option<T>, E>, so a field
        // that was not sent is fine and only a sent value can fail.
        let name = issues.check(name.map(parse_name).transpose());
        let size = issues.check(size.map(PlotSize::parse).transpose());
        let size_unit = issues.check(size_unit.map(SizeUnit::parse_field).transpose());
        let notes = issues.check(notes.map(parse_notes).transpose());

        if let (Some(name), Some(size), Some(size_unit), Some(notes)) =
            (name, size, size_unit, notes)
        {
            return Ok(Self {
                name,
                size,
                size_unit,
                notes,
            });
        }
        Err(issues.into_error())
    }

    /// The new name, if it changes.
    #[must_use]
    pub fn name(&self) -> Option<&str> {
        self.name.as_deref()
    }

    /// The new size, if it changes.
    #[must_use]
    pub fn size(&self) -> Option<PlotSize> {
        self.size
    }

    /// The new size unit, if it changes.
    #[must_use]
    pub fn size_unit(&self) -> Option<SizeUnit> {
        self.size_unit
    }

    /// `None`: leave the notes. `Some(None)`: clear them. `Some(Some(x))`: set them.
    #[must_use]
    pub fn notes(&self) -> Option<Option<&str>> {
        self.notes.as_ref().map(Option::as_deref)
    }
}

/// A plot with crop cycles cannot be deleted: the cycles (and their
/// activities) are the farmer's season history and would lose their plot.
///
/// # Errors
/// [`CoreError::PlotHasCrops`] when `crop_cycle_count` is above zero.
pub fn ensure_deletable(crop_cycle_count: u64) -> Result<(), CoreError> {
    if crop_cycle_count == 0 {
        Ok(())
    } else {
        Err(CoreError::PlotHasCrops)
    }
}

fn parse_name(input: &str) -> Result<String, FieldIssue> {
    text::required("name", input, NAME_MAX_CHARS)
}

fn parse_notes(input: Option<&str>) -> Result<Option<String>, FieldIssue> {
    text::optional("notes", input, NOTES_MAX_CHARS)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn issues_of(err: CoreError) -> Vec<FieldIssue> {
        match err {
            CoreError::Fields(issues) => issues,
            other => panic!("expected CoreError::Fields, got {other:?}"),
        }
    }

    fn issue(field: &str, code: IssueCode) -> FieldIssue {
        FieldIssue::new(field, code)
    }

    fn hundredths(value: f64) -> i32 {
        PlotSize::parse(value)
            .unwrap_or_else(|e| panic!("{value}: {e:?}"))
            .hundredths()
    }

    #[test]
    fn size_accepts_the_range_edges() {
        assert_eq!(hundredths(0.01), 1);
        assert_eq!(hundredths(0.5), 50);
        assert_eq!(hundredths(1.0), 100);
        assert_eq!(hundredths(999.99), 99_999);
        assert_eq!(hundredths(1000.0), 100_000);
    }

    #[test]
    fn size_refuses_zero_negative_and_above_1000() {
        for value in [
            0.0,
            -0.0,
            -1.0,
            1000.01,
            1000.001,
            1001.0,
            f64::NAN,
            f64::INFINITY,
            f64::NEG_INFINITY,
        ] {
            assert_eq!(
                PlotSize::parse(value),
                Err(issue("size", IssueCode::OutOfRange)),
                "value {value}"
            );
        }
    }

    #[test]
    fn size_is_rounded_to_two_decimals() {
        assert_eq!(hundredths(1.234), 123); // rounds down
        assert_eq!(hundredths(1.236), 124); // rounds up
        assert_eq!(hundredths(0.125), 13); // half rounds away from zero
        assert_eq!(hundredths(0.1 + 0.2), 30); // float noise disappears
        assert_eq!(hundredths(999.996), 100_000); // rounds up to exactly 1000
        assert_eq!(hundredths(0.005), 1); // half of a hundredth rounds up to 0.01
    }

    #[test]
    fn size_that_rounds_to_zero_is_refused() {
        for value in [0.001, 0.004] {
            assert_eq!(
                PlotSize::parse(value),
                Err(issue("size", IssueCode::OutOfRange)),
                "value {value}"
            );
        }
    }

    #[test]
    fn size_value_round_trips_through_hundredths() {
        let size = PlotSize::parse(0.5).unwrap();
        assert!((size.value() - 0.5).abs() < f64::EPSILON);
        assert!((PlotSize::value_of_hundredths(12_345) - 123.45).abs() < 1e-9);
        assert!((PlotSize::value_of_hundredths(100_000) - 1000.0).abs() < f64::EPSILON);
    }

    #[test]
    fn size_unit_parses_the_three_units() {
        assert_eq!(SizeUnit::parse_field("acres"), Ok(SizeUnit::Acres));
        assert_eq!(SizeUnit::parse_field("hectares"), Ok(SizeUnit::Hectares));
        assert_eq!(SizeUnit::Acres.as_str(), "acres");
        assert_eq!(SizeUnit::Hectares.as_str(), "hectares");
        assert_eq!(SizeUnit::parse_field("plots_50x100"), Ok(SizeUnit::Plots50x100));
        assert_eq!(SizeUnit::Plots50x100.as_str(), "plots_50x100");
        for input in ["", "Acres", "acre", "ha", "hectare", " acres", "sqm"] {
            assert_eq!(
                SizeUnit::parse_field(input),
                Err(issue("sizeUnit", IssueCode::InvalidChoice)),
                "input {input:?}"
            );
        }
    }

    #[test]
    fn new_plot_trims_and_keeps_valid_fields() {
        let plot = NewPlot::parse("  Plot A ", 0.5, "acres", Some("  red soil ")).unwrap();
        assert_eq!(plot.name(), "Plot A");
        assert_eq!(plot.size().hundredths(), 50);
        assert_eq!(plot.size_unit(), SizeUnit::Acres);
        assert_eq!(plot.notes(), Some("red soil"));
    }

    #[test]
    fn new_plot_notes_are_optional_and_empty_becomes_none() {
        for notes in [None, Some(""), Some("  \n ")] {
            let plot = NewPlot::parse("P", 1.0, "hectares", notes).unwrap();
            assert_eq!(plot.notes(), None, "notes {notes:?}");
        }
    }

    #[test]
    fn new_plot_name_and_notes_boundaries() {
        let eighty = "p".repeat(NAME_MAX_CHARS);
        assert_eq!(
            NewPlot::parse(&eighty, 1.0, "acres", None).unwrap().name(),
            eighty
        );
        let err = NewPlot::parse(&"p".repeat(NAME_MAX_CHARS + 1), 1.0, "acres", None).unwrap_err();
        assert_eq!(issues_of(err), vec![issue("name", IssueCode::TooLong)]);
        let err = NewPlot::parse("  ", 1.0, "acres", None).unwrap_err();
        assert_eq!(issues_of(err), vec![issue("name", IssueCode::Required)]);

        let five_hundred = "n".repeat(NOTES_MAX_CHARS);
        let plot = NewPlot::parse("P", 1.0, "acres", Some(&five_hundred)).unwrap();
        assert_eq!(plot.notes(), Some(five_hundred.as_str()));
        let long = "n".repeat(NOTES_MAX_CHARS + 1);
        let err = NewPlot::parse("P", 1.0, "acres", Some(&long)).unwrap_err();
        assert_eq!(issues_of(err), vec![issue("notes", IssueCode::TooLong)]);
    }

    #[test]
    fn new_plot_reports_every_failing_field() {
        let long = "n".repeat(NOTES_MAX_CHARS + 1);
        let err = NewPlot::parse("", 0.0, "furlongs", Some(&long)).unwrap_err();
        assert_eq!(
            issues_of(err),
            vec![
                issue("name", IssueCode::Required),
                issue("size", IssueCode::OutOfRange),
                issue("sizeUnit", IssueCode::InvalidChoice),
                issue("notes", IssueCode::TooLong),
            ]
        );
    }

    #[test]
    fn changes_check_only_what_was_sent() {
        let empty = PlotChanges::parse(None, None, None, None).unwrap();
        assert_eq!(empty, PlotChanges::default());

        let changes = PlotChanges::parse(Some(" B "), Some(2.345_1), Some("hectares"), None).unwrap();
        assert_eq!(changes.name(), Some("B"));
        assert_eq!(changes.size().map(PlotSize::hundredths), Some(235));
        assert_eq!(changes.size_unit(), Some(SizeUnit::Hectares));
        assert_eq!(changes.notes(), None);
    }

    #[test]
    fn changes_notes_can_be_set_or_cleared() {
        let set = PlotChanges::parse(None, None, None, Some(Some(" loam "))).unwrap();
        assert_eq!(set.notes(), Some(Some("loam")));
        let cleared = PlotChanges::parse(None, None, None, Some(None)).unwrap();
        assert_eq!(cleared.notes(), Some(None));
        let emptied = PlotChanges::parse(None, None, None, Some(Some(""))).unwrap();
        assert_eq!(emptied.notes(), Some(None));
    }

    #[test]
    fn changes_apply_the_same_rules_and_report_every_field() {
        let err = PlotChanges::parse(Some(""), Some(1000.01), Some("ha"), None).unwrap_err();
        assert_eq!(
            issues_of(err),
            vec![
                issue("name", IssueCode::Required),
                issue("size", IssueCode::OutOfRange),
                issue("sizeUnit", IssueCode::InvalidChoice),
            ]
        );
        let err = PlotChanges::parse(None, Some(0.0), None, None).unwrap_err();
        assert_eq!(issues_of(err), vec![issue("size", IssueCode::OutOfRange)]);
    }

    #[test]
    fn only_a_plot_without_crop_cycles_can_be_deleted() {
        assert_eq!(ensure_deletable(0), Ok(()));
        assert_eq!(ensure_deletable(1), Err(CoreError::PlotHasCrops));
        assert_eq!(ensure_deletable(12), Err(CoreError::PlotHasCrops));
    }
}
