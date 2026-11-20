//! Activity rules: one piece of farm work logged against a crop cycle, with
//! what was used, how much, and what it cost.
//!
//! Same approach as `plot.rs`: "parse, don't validate" types, every failing
//! field reported together, and the quantity kept as whole hundredths
//! (2.5 kg = 250) so floats never reach the database.
//!
//! An activity records what the farmer did; Falcon AI never suggests a
//! chemical or a dose (VISION.md, Safety).

use chrono::{Days, NaiveDate};
use serde::{Serialize, Serializer};

use crate::error::{CoreError, FieldIssue, IssueCode, Issues};
use crate::text;

/// Longest `input` (what was used, e.g. "DAP"), after trimming.
pub const INPUT_MAX_CHARS: usize = 80;
/// Longest notes, after trimming.
pub const NOTES_MAX_CHARS: usize = 500;
/// Largest `costKes`, in whole shillings.
pub const COST_MAX_KES: i64 = 10_000_000;
/// `doneOn` may be at most this many days before the cycle's planting date
/// (land preparation happens before planting).
pub const DONE_MAX_DAYS_BEFORE_PLANTING: u64 = 60;

/// What kind of work it was. Serialised in snake_case (`land_preparation`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ActivityKind {
    /// `land_preparation`
    LandPreparation,
    /// `planting`
    Planting,
    /// `weeding`
    Weeding,
    /// `fertiliser`
    Fertiliser,
    /// `pest_disease_control`
    PestDiseaseControl,
    /// `irrigation`
    Irrigation,
    /// `harvest`
    Harvest,
    /// `other`
    Other,
}

impl ActivityKind {
    /// Every kind, in the order of `ActivityKind` in `api/openapi.yaml`.
    pub const ALL: [Self; 8] = [
        Self::LandPreparation,
        Self::Planting,
        Self::Weeding,
        Self::Fertiliser,
        Self::PestDiseaseControl,
        Self::Irrigation,
        Self::Harvest,
        Self::Other,
    ];

    /// The wire name, e.g. `land_preparation`.
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::LandPreparation => "land_preparation",
            Self::Planting => "planting",
            Self::Weeding => "weeding",
            Self::Fertiliser => "fertiliser",
            Self::PestDiseaseControl => "pest_disease_control",
            Self::Irrigation => "irrigation",
            Self::Harvest => "harvest",
            Self::Other => "other",
        }
    }

    /// Parses a kind slug (exact). `None` for anything else.
    #[must_use]
    pub fn from_slug(slug: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|k| k.as_str() == slug)
    }

    /// Parses the `kind` input field.
    ///
    /// # Errors
    /// `kind: invalid_choice` for anything but the eight kinds.
    pub fn parse_field(slug: &str) -> Result<Self, FieldIssue> {
        Self::from_slug(slug).ok_or_else(|| FieldIssue::new("kind", IssueCode::InvalidChoice))
    }
}

impl Serialize for ActivityKind {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_str())
    }
}

/// The unit of an activity's quantity. Serialised in snake_case (`person_days`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum QuantityUnit {
    /// `kg`
    Kg,
    /// `g`
    G,
    /// `litres`
    Litres,
    /// `ml`
    Ml,
    /// `bags`
    Bags,
    /// `pieces`
    Pieces,
    /// `person_days`: labour, one person working one day.
    PersonDays,
}

impl QuantityUnit {
    /// Every unit, in the order of `QuantityUnit` in `api/openapi.yaml`.
    pub const ALL: [Self; 7] = [
        Self::Kg,
        Self::G,
        Self::Litres,
        Self::Ml,
        Self::Bags,
        Self::Pieces,
        Self::PersonDays,
    ];

    /// The wire name, e.g. `person_days`.
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Kg => "kg",
            Self::G => "g",
            Self::Litres => "litres",
            Self::Ml => "ml",
            Self::Bags => "bags",
            Self::Pieces => "pieces",
            Self::PersonDays => "person_days",
        }
    }

    /// Parses a unit slug (exact). `None` for anything else.
    #[must_use]
    pub fn from_slug(slug: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|u| u.as_str() == slug)
    }

    /// Parses the `quantityUnit` input field.
    ///
    /// # Errors
    /// `quantityUnit: invalid_choice` for anything but the seven units.
    pub fn parse_field(slug: &str) -> Result<Self, FieldIssue> {
        Self::from_slug(slug)
            .ok_or_else(|| FieldIssue::new("quantityUnit", IssueCode::InvalidChoice))
    }
}

impl Serialize for QuantityUnit {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_str())
    }
}

/// A quantity: greater than 0 and at most 100000, to 2 decimal places, held
/// as whole hundredths (like `PlotSize`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Quantity(i32);

impl Quantity {
    /// Largest quantity.
    pub const MAX: f64 = 100_000.0;
    /// Hundredths in one unit.
    pub const HUNDREDTHS_PER_UNIT: i32 = 100;

    /// Checks a quantity and rounds it to 2 decimal places.
    ///
    /// # Errors
    /// `quantity: out_of_range` when it is not a finite number above 0 and at
    /// most 100000, or rounds to 0.00.
    pub fn parse(value: f64) -> Result<Self, FieldIssue> {
        let out_of_range = || FieldIssue::new("quantity", IssueCode::OutOfRange);
        if !value.is_finite() || value <= 0.0 || value > Self::MAX {
            return Err(out_of_range());
        }
        // At most 10_000_000 after rounding, well inside i32; `as` from f64
        // saturates rather than wrapping, so nothing unexpected can happen.
        let hundredths = (value * f64::from(Self::HUNDREDTHS_PER_UNIT)).round() as i32;
        if hundredths == 0 {
            return Err(out_of_range());
        }
        Ok(Self(hundredths))
    }

    /// Whole hundredths, as stored (2.5 → 250).
    #[must_use]
    pub fn hundredths(self) -> i32 {
        self.0
    }

    /// Turns a stored hundredths value back into the number sent to clients.
    #[must_use]
    pub fn value_of_hundredths(hundredths: i32) -> f64 {
        f64::from(hundredths) / f64::from(Self::HUNDREDTHS_PER_UNIT)
    }
}

/// The raw fields of a new activity, as the client sent them.
///
/// A struct instead of seven function arguments: named fields cannot be
/// passed in the wrong order, which seven `Option`s in a row easily could.
#[derive(Debug, Clone, Copy, Default)]
pub struct ActivityFields<'a> {
    /// Activity kind slug.
    pub kind: &'a str,
    /// The day the work was done. `None` only in [`Default`]; the API
    /// requires it.
    pub done_on: Option<NaiveDate>,
    /// What was used.
    pub input: Option<&'a str>,
    /// How much.
    pub quantity: Option<f64>,
    /// The unit of `quantity`.
    pub quantity_unit: Option<&'a str>,
    /// Cost in whole shillings.
    pub cost_kes: Option<i64>,
    /// Free notes.
    pub notes: Option<&'a str>,
}

/// A valid new activity.
#[derive(Debug, Clone, PartialEq)]
pub struct NewActivity {
    kind: ActivityKind,
    done_on: NaiveDate,
    input: Option<String>,
    quantity: Option<(Quantity, QuantityUnit)>,
    cost_kes: Option<i64>,
    notes: Option<String>,
}

impl NewActivity {
    /// Checks every field of a new activity for a cycle planted on
    /// `planted_on`, as of `today`.
    ///
    /// - `kind`: one of the eight kinds.
    /// - `doneOn`: not after `today`, and not more than 60 days before
    ///   `planted_on` (`out_of_range`).
    /// - `input`: optional, up to 80 characters.
    /// - `quantity`: optional, above 0 and at most 100000, rounded to 2
    ///   decimals; needs `quantityUnit`, and `quantityUnit` needs it.
    /// - `costKes`: optional, 0 to 10000000 whole shillings.
    /// - `notes`: optional, up to 500 characters.
    ///
    /// # Errors
    /// [`CoreError::Fields`] listing every failing field.
    pub fn parse(
        fields: &ActivityFields<'_>,
        planted_on: NaiveDate,
        today: NaiveDate,
    ) -> Result<Self, CoreError> {
        let mut issues = Issues::default();
        let kind = issues.check(ActivityKind::parse_field(fields.kind));
        let done_on = issues.check(
            fields
                .done_on
                .ok_or_else(|| FieldIssue::new("doneOn", IssueCode::Required))
                .and_then(|d| parse_done_on(d, planted_on, today)),
        );
        let input = issues.check(parse_input(fields.input));
        let quantity = issues.check(fields.quantity.map(Quantity::parse).transpose());
        let unit = issues.check(fields.quantity_unit.map(QuantityUnit::parse_field).transpose());
        let cost_kes = issues.check(fields.cost_kes.map(parse_cost).transpose());
        let notes = issues.check(parse_notes(fields.notes));

        // The pair rule runs only when both fields parsed, so a bad quantity
        // is not reported twice.
        let pair = match (quantity, unit) {
            (Some(q), Some(u)) => issues.check(pair_quantity(q, u)),
            _ => None,
        };

        if let (Some(kind), Some(done_on), Some(input), Some(quantity), Some(cost_kes), Some(notes)) =
            (kind, done_on, input, pair, cost_kes, notes)
        {
            return Ok(Self {
                kind,
                done_on,
                input,
                quantity,
                cost_kes,
                notes,
            });
        }
        Err(issues.into_error())
    }

    /// The kind of work.
    #[must_use]
    pub fn kind(&self) -> ActivityKind {
        self.kind
    }

    /// The day it was done.
    #[must_use]
    pub fn done_on(&self) -> NaiveDate {
        self.done_on
    }

    /// What was used, or `None`.
    #[must_use]
    pub fn input(&self) -> Option<&str> {
        self.input.as_deref()
    }

    /// The quantity and its unit, or `None` (always both or neither).
    #[must_use]
    pub fn quantity(&self) -> Option<(Quantity, QuantityUnit)> {
        self.quantity
    }

    /// The cost in whole shillings, or `None`.
    #[must_use]
    pub fn cost_kes(&self) -> Option<i64> {
        self.cost_kes
    }

    /// The trimmed notes, or `None`.
    #[must_use]
    pub fn notes(&self) -> Option<&str> {
        self.notes.as_deref()
    }
}

/// The raw fields of an activity update. For each field the outer `Option`
/// is "was it sent"; for optional fields the inner one is "set or clear".
#[derive(Debug, Clone, Copy, Default)]
pub struct ActivityPatchFields<'a> {
    /// New kind slug.
    pub kind: Option<&'a str>,
    /// New day.
    pub done_on: Option<NaiveDate>,
    /// New input, or clear.
    pub input: Option<Option<&'a str>>,
    /// New quantity, or clear.
    pub quantity: Option<Option<f64>>,
    /// New unit, or clear.
    pub quantity_unit: Option<Option<&'a str>>,
    /// New cost, or clear.
    pub cost_kes: Option<Option<i64>>,
    /// New notes, or clear.
    pub notes: Option<Option<&'a str>>,
}

/// What is stored now, for the rules an update must check against it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct StoredActivity {
    /// True when a quantity is stored.
    pub has_quantity: bool,
    /// True when a quantity unit is stored.
    pub has_unit: bool,
}

/// A valid partial update of an activity. `None` means "leave as is".
#[derive(Debug, Clone, PartialEq, Default)]
pub struct ActivityChanges {
    kind: Option<ActivityKind>,
    done_on: Option<NaiveDate>,
    input: Option<Option<String>>,
    quantity: Option<Option<Quantity>>,
    quantity_unit: Option<Option<QuantityUnit>>,
    cost_kes: Option<Option<i64>>,
    notes: Option<Option<String>>,
}

impl ActivityChanges {
    /// Checks the sent fields with the same rules as [`NewActivity::parse`].
    /// The quantity/unit pair rule is checked on the result: the sent values
    /// combined with what `stored` says is kept.
    ///
    /// # Errors
    /// [`CoreError::Fields`] listing every failing field.
    pub fn parse(
        fields: &ActivityPatchFields<'_>,
        stored: StoredActivity,
        planted_on: NaiveDate,
        today: NaiveDate,
    ) -> Result<Self, CoreError> {
        let mut issues = Issues::default();
        // `transpose`: Option<Result<T, E>> → Result<Option<T>, E>, so a field
        // that was not sent is fine and only a sent value can fail.
        let kind = issues.check(fields.kind.map(ActivityKind::parse_field).transpose());
        let done_on = issues.check(
            fields
                .done_on
                .map(|d| parse_done_on(d, planted_on, today))
                .transpose(),
        );
        let input = issues.check(fields.input.map(parse_input).transpose());
        // Two layers: Some(None) (sent as null) clears, Some(Some(x)) is checked.
        let quantity = issues.check(
            fields
                .quantity
                .map(|q| q.map(Quantity::parse).transpose())
                .transpose(),
        );
        let quantity_unit = issues.check(
            fields
                .quantity_unit
                .map(|u| u.map(QuantityUnit::parse_field).transpose())
                .transpose(),
        );
        let cost_kes = issues.check(
            fields
                .cost_kes
                .map(|c| c.map(parse_cost).transpose())
                .transpose(),
        );
        let notes = issues.check(fields.notes.map(parse_notes).transpose());

        if let (Some(q), Some(u)) = (quantity, quantity_unit) {
            // What the activity will hold after the update: the sent value
            // where one was sent, the stored one otherwise.
            let has_quantity = q.map_or(stored.has_quantity, |sent| sent.is_some());
            let has_unit = u.map_or(stored.has_unit, |sent| sent.is_some());
            if let Some(issue) = pair_issue(has_quantity, has_unit) {
                issues.push(issue);
            }
        }

        if let (
            true,
            Some(kind),
            Some(done_on),
            Some(input),
            Some(quantity),
            Some(quantity_unit),
            Some(cost_kes),
            Some(notes),
        ) = (
            issues.is_empty(),
            kind,
            done_on,
            input,
            quantity,
            quantity_unit,
            cost_kes,
            notes,
        ) {
            return Ok(Self {
                kind,
                done_on,
                input,
                quantity,
                quantity_unit,
                cost_kes,
                notes,
            });
        }
        Err(issues.into_error())
    }

    /// The new kind, if it changes.
    #[must_use]
    pub fn kind(&self) -> Option<ActivityKind> {
        self.kind
    }

    /// The new day, if it changes.
    #[must_use]
    pub fn done_on(&self) -> Option<NaiveDate> {
        self.done_on
    }

    /// `None`: leave. `Some(None)`: clear. `Some(Some(x))`: set.
    #[must_use]
    pub fn input(&self) -> Option<Option<&str>> {
        self.input.as_ref().map(Option::as_deref)
    }

    /// `None`: leave. `Some(None)`: clear. `Some(Some(x))`: set.
    #[must_use]
    pub fn quantity(&self) -> Option<Option<Quantity>> {
        self.quantity
    }

    /// `None`: leave. `Some(None)`: clear. `Some(Some(x))`: set.
    #[must_use]
    pub fn quantity_unit(&self) -> Option<Option<QuantityUnit>> {
        self.quantity_unit
    }

    /// `None`: leave. `Some(None)`: clear. `Some(Some(x))`: set.
    #[must_use]
    pub fn cost_kes(&self) -> Option<Option<i64>> {
        self.cost_kes
    }

    /// `None`: leave. `Some(None)`: clear. `Some(Some(x))`: set.
    #[must_use]
    pub fn notes(&self) -> Option<Option<&str>> {
        self.notes.as_ref().map(Option::as_deref)
    }
}

fn parse_done_on(
    done_on: NaiveDate,
    planted_on: NaiveDate,
    today: NaiveDate,
) -> Result<NaiveDate, FieldIssue> {
    let earliest = planted_on.checked_sub_days(Days::new(DONE_MAX_DAYS_BEFORE_PLANTING));
    // `None` only at chrono's date limits; then there is no lower bound.
    if done_on > today || earliest.is_some_and(|e| done_on < e) {
        return Err(FieldIssue::new("doneOn", IssueCode::OutOfRange));
    }
    Ok(done_on)
}

fn parse_input(input: Option<&str>) -> Result<Option<String>, FieldIssue> {
    text::optional("input", input, INPUT_MAX_CHARS)
}

fn parse_notes(input: Option<&str>) -> Result<Option<String>, FieldIssue> {
    text::optional("notes", input, NOTES_MAX_CHARS)
}

fn parse_cost(cost: i64) -> Result<i64, FieldIssue> {
    if (0..=COST_MAX_KES).contains(&cost) {
        Ok(cost)
    } else {
        Err(FieldIssue::new("costKes", IssueCode::OutOfRange))
    }
}

/// Quantity and unit come together or not at all.
///
/// - a quantity without a unit: `quantity: not_allowed` (the contract's own
///   example of `not_allowed`);
/// - a unit without a quantity: `quantity: required`.
fn pair_issue(has_quantity: bool, has_unit: bool) -> Option<FieldIssue> {
    match (has_quantity, has_unit) {
        (true, false) => Some(FieldIssue::new("quantity", IssueCode::NotAllowed)),
        (false, true) => Some(FieldIssue::new("quantity", IssueCode::Required)),
        _ => None,
    }
}

fn pair_quantity(
    quantity: Option<Quantity>,
    unit: Option<QuantityUnit>,
) -> Result<Option<(Quantity, QuantityUnit)>, FieldIssue> {
    if let Some(issue) = pair_issue(quantity.is_some(), unit.is_some()) {
        return Err(issue);
    }
    // `zip` is Some only when both are Some, which the check above guarantees
    // is the only non-empty case.
    Ok(quantity.zip(unit))
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

    fn planted() -> NaiveDate {
        date(2026, 10, 1)
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

    fn minimal() -> ActivityFields<'static> {
        ActivityFields {
            kind: "weeding",
            done_on: Some(today()),
            ..ActivityFields::default()
        }
    }

    fn parse(fields: &ActivityFields<'_>) -> Result<NewActivity, CoreError> {
        NewActivity::parse(fields, planted(), today())
    }

    #[test]
    fn kinds_and_units_match_the_contract() {
        let kinds: Vec<&str> = ActivityKind::ALL.iter().map(|k| k.as_str()).collect();
        assert_eq!(
            kinds,
            [
                "land_preparation",
                "planting",
                "weeding",
                "fertiliser",
                "pest_disease_control",
                "irrigation",
                "harvest",
                "other"
            ]
        );
        let units: Vec<&str> = QuantityUnit::ALL.iter().map(|u| u.as_str()).collect();
        assert_eq!(units, ["kg", "g", "litres", "ml", "bags", "pieces", "person_days"]);
        for kind in ActivityKind::ALL {
            assert_eq!(ActivityKind::from_slug(kind.as_str()), Some(kind));
        }
        for unit in QuantityUnit::ALL {
            assert_eq!(QuantityUnit::from_slug(unit.as_str()), Some(unit));
        }
        assert_eq!(
            ActivityKind::parse_field("Weeding"),
            Err(issue("kind", IssueCode::InvalidChoice))
        );
        assert_eq!(
            QuantityUnit::parse_field("kgs"),
            Err(issue("quantityUnit", IssueCode::InvalidChoice))
        );
    }

    #[test]
    fn a_minimal_activity_is_valid() {
        let a = parse(&minimal()).unwrap();
        assert_eq!(a.kind(), ActivityKind::Weeding);
        assert_eq!(a.done_on(), today());
        assert_eq!(a.input(), None);
        assert_eq!(a.quantity(), None);
        assert_eq!(a.cost_kes(), None);
        assert_eq!(a.notes(), None);
    }

    #[test]
    fn a_full_activity_keeps_every_field() {
        let fields = ActivityFields {
            kind: "fertiliser",
            done_on: Some(date(2026, 10, 20)),
            input: Some("  DAP "),
            quantity: Some(2.506),
            quantity_unit: Some("bags"),
            cost_kes: Some(7_000),
            notes: Some(" top dressing "),
        };
        let a = parse(&fields).unwrap();
        assert_eq!(a.kind(), ActivityKind::Fertiliser);
        assert_eq!(a.input(), Some("DAP"));
        let (q, u) = a.quantity().unwrap();
        assert_eq!(q.hundredths(), 251); // rounded to 2 decimal places
        assert_eq!(u, QuantityUnit::Bags);
        assert_eq!(a.cost_kes(), Some(7_000));
        assert_eq!(a.notes(), Some("top dressing"));
    }

    #[test]
    fn done_on_boundaries() {
        let sixty_before = planted() - Days::new(60);
        for ok in [today(), planted(), sixty_before] {
            let fields = ActivityFields {
                done_on: Some(ok),
                ..minimal()
            };
            assert!(parse(&fields).is_ok(), "{ok}");
        }
        for bad in [today() + Days::new(1), sixty_before - Days::new(1)] {
            let fields = ActivityFields {
                done_on: Some(bad),
                ..minimal()
            };
            assert_eq!(
                issues_of(parse(&fields).unwrap_err()),
                vec![issue("doneOn", IssueCode::OutOfRange)],
                "{bad}"
            );
        }
        let missing = ActivityFields {
            done_on: None,
            ..minimal()
        };
        assert_eq!(
            issues_of(parse(&missing).unwrap_err()),
            vec![issue("doneOn", IssueCode::Required)]
        );
    }

    #[test]
    fn quantity_boundaries() {
        let with = |q: f64| ActivityFields {
            quantity: Some(q),
            quantity_unit: Some("kg"),
            ..minimal()
        };
        for (value, hundredths) in [(0.01, 1), (0.005, 1), (1.0, 100), (100_000.0, 10_000_000)] {
            let (q, _) = parse(&with(value)).unwrap().quantity().unwrap();
            assert_eq!(q.hundredths(), hundredths, "{value}");
        }
        for value in [0.0, -1.0, 0.004, 100_000.01, f64::NAN, f64::INFINITY] {
            assert_eq!(
                issues_of(parse(&with(value)).unwrap_err()),
                vec![issue("quantity", IssueCode::OutOfRange)],
                "{value}"
            );
        }
        assert!((Quantity::value_of_hundredths(250) - 2.5).abs() < f64::EPSILON);
    }

    #[test]
    fn quantity_and_unit_come_together() {
        let no_unit = ActivityFields {
            quantity: Some(5.0),
            ..minimal()
        };
        assert_eq!(
            issues_of(parse(&no_unit).unwrap_err()),
            vec![issue("quantity", IssueCode::NotAllowed)]
        );
        let no_quantity = ActivityFields {
            quantity_unit: Some("kg"),
            ..minimal()
        };
        assert_eq!(
            issues_of(parse(&no_quantity).unwrap_err()),
            vec![issue("quantity", IssueCode::Required)]
        );
        // A bad unit is reported once, without the pair rule piling on.
        let bad_unit = ActivityFields {
            quantity: Some(5.0),
            quantity_unit: Some("tonnes"),
            ..minimal()
        };
        assert_eq!(
            issues_of(parse(&bad_unit).unwrap_err()),
            vec![issue("quantityUnit", IssueCode::InvalidChoice)]
        );
    }

    #[test]
    fn cost_boundaries() {
        for ok in [0, 1, COST_MAX_KES] {
            let fields = ActivityFields {
                cost_kes: Some(ok),
                ..minimal()
            };
            assert_eq!(parse(&fields).unwrap().cost_kes(), Some(ok));
        }
        for bad in [-1, COST_MAX_KES + 1, i64::MAX, i64::MIN] {
            let fields = ActivityFields {
                cost_kes: Some(bad),
                ..minimal()
            };
            assert_eq!(
                issues_of(parse(&fields).unwrap_err()),
                vec![issue("costKes", IssueCode::OutOfRange)],
                "{bad}"
            );
        }
    }

    #[test]
    fn input_and_notes_boundaries() {
        let input = "i".repeat(INPUT_MAX_CHARS);
        let notes = "n".repeat(NOTES_MAX_CHARS);
        let fields = ActivityFields {
            input: Some(&input),
            notes: Some(&notes),
            ..minimal()
        };
        assert!(parse(&fields).is_ok());

        let long_input = "i".repeat(INPUT_MAX_CHARS + 1);
        let long_notes = "n".repeat(NOTES_MAX_CHARS + 1);
        let fields = ActivityFields {
            input: Some(&long_input),
            notes: Some(&long_notes),
            ..minimal()
        };
        assert_eq!(
            issues_of(parse(&fields).unwrap_err()),
            vec![
                issue("input", IssueCode::TooLong),
                issue("notes", IssueCode::TooLong)
            ]
        );
        let blank = ActivityFields {
            input: Some("  "),
            notes: Some(""),
            ..minimal()
        };
        let a = parse(&blank).unwrap();
        assert_eq!((a.input(), a.notes()), (None, None));
    }

    #[test]
    fn new_activity_reports_every_failing_field() {
        let long = "n".repeat(NOTES_MAX_CHARS + 1);
        let fields = ActivityFields {
            kind: "spraying",
            done_on: Some(today() + Days::new(1)),
            input: None,
            quantity: Some(0.0),
            quantity_unit: Some("kg"),
            cost_kes: Some(-5),
            notes: Some(&long),
        };
        assert_eq!(
            issues_of(parse(&fields).unwrap_err()),
            vec![
                issue("kind", IssueCode::InvalidChoice),
                issue("doneOn", IssueCode::OutOfRange),
                issue("quantity", IssueCode::OutOfRange),
                issue("costKes", IssueCode::OutOfRange),
                issue("notes", IssueCode::TooLong),
            ]
        );
    }

    fn patch(
        fields: &ActivityPatchFields<'_>,
        stored: StoredActivity,
    ) -> Result<ActivityChanges, CoreError> {
        ActivityChanges::parse(fields, stored, planted(), today())
    }

    const EMPTY: StoredActivity = StoredActivity {
        has_quantity: false,
        has_unit: false,
    };
    const PAIRED: StoredActivity = StoredActivity {
        has_quantity: true,
        has_unit: true,
    };

    #[test]
    fn changes_check_only_what_was_sent() {
        let none = patch(&ActivityPatchFields::default(), EMPTY).unwrap();
        assert_eq!(none, ActivityChanges::default());

        let fields = ActivityPatchFields {
            kind: Some("harvest"),
            done_on: Some(today()),
            input: Some(None),
            cost_kes: Some(Some(0)),
            notes: Some(Some(" ok ")),
            ..ActivityPatchFields::default()
        };
        let changes = patch(&fields, EMPTY).unwrap();
        assert_eq!(changes.kind(), Some(ActivityKind::Harvest));
        assert_eq!(changes.done_on(), Some(today()));
        assert_eq!(changes.input(), Some(None));
        assert_eq!(changes.cost_kes(), Some(Some(0)));
        assert_eq!(changes.notes(), Some(Some("ok")));
        assert_eq!(changes.quantity(), None);
    }

    #[test]
    fn changes_keep_quantity_and_unit_paired_with_what_is_stored() {
        // Changing only the quantity of a paired activity keeps its unit.
        let q = ActivityPatchFields {
            quantity: Some(Some(3.0)),
            ..ActivityPatchFields::default()
        };
        assert!(patch(&q, PAIRED).is_ok());
        // …but an activity without a unit cannot get a quantity alone.
        assert_eq!(
            issues_of(patch(&q, EMPTY).unwrap_err()),
            vec![issue("quantity", IssueCode::NotAllowed)]
        );
        // Clearing only the quantity would leave a unit behind.
        let clear_q = ActivityPatchFields {
            quantity: Some(None),
            ..ActivityPatchFields::default()
        };
        assert_eq!(
            issues_of(patch(&clear_q, PAIRED).unwrap_err()),
            vec![issue("quantity", IssueCode::Required)]
        );
        // Clearing both is fine; so is setting both.
        let clear_both = ActivityPatchFields {
            quantity: Some(None),
            quantity_unit: Some(None),
            ..ActivityPatchFields::default()
        };
        let changes = patch(&clear_both, PAIRED).unwrap();
        assert_eq!(changes.quantity(), Some(None));
        assert_eq!(changes.quantity_unit(), Some(None));
        let set_both = ActivityPatchFields {
            quantity: Some(Some(1.5)),
            quantity_unit: Some(Some("litres")),
            ..ActivityPatchFields::default()
        };
        let changes = patch(&set_both, EMPTY).unwrap();
        assert_eq!(changes.quantity().flatten().map(Quantity::hundredths), Some(150));
        assert_eq!(changes.quantity_unit(), Some(Some(QuantityUnit::Litres)));
    }

    #[test]
    fn changes_apply_the_same_rules_and_report_every_field() {
        let fields = ActivityPatchFields {
            kind: Some("x"),
            done_on: Some(planted() - Days::new(61)),
            quantity: Some(Some(100_001.0)),
            quantity_unit: Some(Some("kg")),
            cost_kes: Some(Some(COST_MAX_KES + 1)),
            ..ActivityPatchFields::default()
        };
        assert_eq!(
            issues_of(patch(&fields, PAIRED).unwrap_err()),
            vec![
                issue("kind", IssueCode::InvalidChoice),
                issue("doneOn", IssueCode::OutOfRange),
                issue("quantity", IssueCode::OutOfRange),
                issue("costKes", IssueCode::OutOfRange),
            ]
        );
    }
}
