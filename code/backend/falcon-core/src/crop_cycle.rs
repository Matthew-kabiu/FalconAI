//! Crop-cycle rules: one crop planted on one plot, from planning to harvest.
//!
//! Same approach as `farm.rs` and `plot.rs`: "parse, don't validate" types,
//! and every failing field is reported together in one [`CoreError::Fields`].
//!
//! Rules that need the database (does the plot belong to the caller, how many
//! open cycles does it have) take what the database said as a plain number,
//! like [`crate::farm::ensure_deletable`], so the rule itself stays here.
//!
//! "Today" is always a parameter (`today`): the caller decides the calendar
//! day (Kenya time in `falcon-api`), and tests can pin it.

use chrono::{Days, NaiveDate};
use serde::{Serialize, Serializer};

use crate::crop::Crop;
use crate::error::{CoreError, FieldIssue, IssueCode, Issues};
use crate::text;

/// Longest `customCrop` (the name of an `other` crop), after trimming.
pub const CUSTOM_CROP_MAX_CHARS: usize = 60;
/// Longest variety, after trimming.
pub const VARIETY_MAX_CHARS: usize = 80;
/// `plantedOn` may be at most this many days before today (about a year).
pub const PLANTED_MAX_DAYS_BEFORE_TODAY: u64 = 365;
/// `plantedOn` may be at most this many days after today (about six months).
pub const PLANTED_MAX_DAYS_AFTER_TODAY: u64 = 183;

/// Where a crop cycle is in its life. Serialised as `planned`, `active`,
/// `harvested` or `abandoned`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum CycleStatus {
    /// Planting date is still ahead.
    Planned,
    /// In the ground.
    Active,
    /// Harvested: closed.
    Harvested,
    /// Given up (failed, destroyed, never planted): closed.
    Abandoned,
}

impl CycleStatus {
    /// Every status, in life order.
    pub const ALL: [Self; 4] = [Self::Planned, Self::Active, Self::Harvested, Self::Abandoned];

    /// The wire name, e.g. `planned`.
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Planned => "planned",
            Self::Active => "active",
            Self::Harvested => "harvested",
            Self::Abandoned => "abandoned",
        }
    }

    /// Parses a status slug (exact, lowercase). `None` for anything else.
    #[must_use]
    pub fn from_slug(slug: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|s| s.as_str() == slug)
    }

    /// Parses the `status` input field.
    ///
    /// # Errors
    /// `status: invalid_choice` for anything but the four statuses.
    pub fn parse_field(slug: &str) -> Result<Self, FieldIssue> {
        Self::from_slug(slug).ok_or_else(|| FieldIssue::new("status", IssueCode::InvalidChoice))
    }

    /// True for `planned` and `active`: the plot is in use. A plot may have
    /// only one open cycle at a time.
    #[must_use]
    pub fn is_open(self) -> bool {
        matches!(self, Self::Planned | Self::Active)
    }

    /// The status a new cycle starts in: `planned` when the planting date is
    /// after today, otherwise `active`.
    #[must_use]
    pub fn initial(planted_on: NaiveDate, today: NaiveDate) -> Self {
        if planted_on > today {
            Self::Planned
        } else {
            Self::Active
        }
    }

    /// Checks a status change. Only forward moves are allowed:
    /// planned → active, planned → abandoned, active → harvested,
    /// active → abandoned. Sending the current status again is not a move
    /// and is allowed (a client may resend the whole form).
    ///
    /// # Errors
    /// [`CoreError::StatusBackwards`] (409) for any other change, including
    /// any change out of `harvested` or `abandoned`.
    pub fn ensure_can_move_to(self, next: Self) -> Result<(), CoreError> {
        // A `match` on a pair checks both values at once; `|` joins patterns.
        let allowed = self == next
            || matches!(
                (self, next),
                (Self::Planned, Self::Active | Self::Abandoned)
                    | (Self::Active, Self::Harvested | Self::Abandoned)
            );
        if allowed {
            Ok(())
        } else {
            Err(CoreError::StatusBackwards)
        }
    }
}

/// Serialises as the slug.
impl Serialize for CycleStatus {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_str())
    }
}

/// A valid new crop cycle.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewCropCycle {
    crop: Crop,
    custom_crop: Option<String>,
    variety: Option<String>,
    planted_on: NaiveDate,
    status: CycleStatus,
}

impl NewCropCycle {
    /// Checks every field of a new crop cycle, as of `today`.
    ///
    /// - `crop`: a catalogue slug, or `other`.
    /// - `customCrop`: when `crop` is `other`, required, 1 to 60 characters
    ///   after trimming; for a catalogue crop it must be absent, null or empty
    ///   (`not_allowed` otherwise).
    /// - `variety`: optional, up to 80 characters; empty becomes `None`.
    /// - `plantedOn`: from 365 days before `today` to 183 days after, both
    ///   included (`out_of_range` otherwise).
    ///
    /// The status is [`CycleStatus::initial`].
    ///
    /// # Errors
    /// [`CoreError::Fields`] listing every failing field.
    pub fn parse(
        crop: &str,
        custom_crop: Option<&str>,
        variety: Option<&str>,
        planted_on: NaiveDate,
        today: NaiveDate,
    ) -> Result<Self, CoreError> {
        let mut issues = Issues::default();
        let crop = issues.check(Crop::parse_field(crop));
        // The customCrop rule depends on the crop, so it runs only once the
        // crop is known; an unknown crop is already reported above.
        let custom_crop = match crop {
            Some(crop) => issues.check(parse_custom_crop(crop, custom_crop)),
            None => Some(None),
        };
        let variety = issues.check(parse_variety(variety));
        let planted_on = issues.check(parse_planted_on(planted_on, today));

        if let (Some(crop), Some(custom_crop), Some(variety), Some(planted_on)) =
            (crop, custom_crop, variety, planted_on)
        {
            return Ok(Self {
                crop,
                custom_crop,
                variety,
                planted_on,
                status: CycleStatus::initial(planted_on, today),
            });
        }
        Err(issues.into_error())
    }

    /// The crop.
    #[must_use]
    pub fn crop(&self) -> Crop {
        self.crop
    }

    /// The farmer's name for an `other` crop; `None` for catalogue crops.
    #[must_use]
    pub fn custom_crop(&self) -> Option<&str> {
        self.custom_crop.as_deref()
    }

    /// The trimmed variety, or `None`.
    #[must_use]
    pub fn variety(&self) -> Option<&str> {
        self.variety.as_deref()
    }

    /// The planting date.
    #[must_use]
    pub fn planted_on(&self) -> NaiveDate {
        self.planted_on
    }

    /// The starting status (`planned` or `active`).
    #[must_use]
    pub fn status(&self) -> CycleStatus {
        self.status
    }
}

/// A valid partial update of a crop cycle. `None` means "leave as is".
///
/// The crop itself cannot change: a different crop is a different cycle.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct CropCycleChanges {
    // Outer Option: was `variety` sent. Inner Option: set or clear.
    variety: Option<Option<String>>,
    planted_on: Option<NaiveDate>,
    status: Option<CycleStatus>,
}

impl CropCycleChanges {
    /// Checks the sent fields with the same rules as [`NewCropCycle::parse`].
    /// `status` must be one of the four slugs; whether the move is allowed is
    /// a separate check against the stored status
    /// ([`CycleStatus::ensure_can_move_to`]), because that needs the database.
    ///
    /// # Errors
    /// [`CoreError::Fields`] listing every failing field.
    pub fn parse(
        variety: Option<Option<&str>>,
        planted_on: Option<NaiveDate>,
        status: Option<&str>,
        today: NaiveDate,
    ) -> Result<Self, CoreError> {
        let mut issues = Issues::default();
        // `transpose`: Option<Result<T, E>> → Result<Option<T>, E>, so a field
        // that was not sent is fine and only a sent value can fail.
        let variety = issues.check(variety.map(parse_variety).transpose());
        let planted_on = issues.check(
            planted_on
                .map(|date| parse_planted_on(date, today))
                .transpose(),
        );
        let status = issues.check(status.map(CycleStatus::parse_field).transpose());

        if let (Some(variety), Some(planted_on), Some(status)) = (variety, planted_on, status) {
            return Ok(Self {
                variety,
                planted_on,
                status,
            });
        }
        Err(issues.into_error())
    }

    /// `None`: leave the variety. `Some(None)`: clear it. `Some(Some(x))`: set it.
    #[must_use]
    pub fn variety(&self) -> Option<Option<&str>> {
        self.variety.as_ref().map(Option::as_deref)
    }

    /// The new planting date, if it changes.
    #[must_use]
    pub fn planted_on(&self) -> Option<NaiveDate> {
        self.planted_on
    }

    /// The requested status, if sent.
    #[must_use]
    pub fn status(&self) -> Option<CycleStatus> {
        self.status
    }
}

/// A plot may have only one open (planned or active) crop cycle.
///
/// # Errors
/// [`CoreError::OpenCycleExists`] (409) when `open_cycles` is above zero.
pub fn ensure_no_open_cycle(open_cycles: u64) -> Result<(), CoreError> {
    if open_cycles == 0 {
        Ok(())
    } else {
        Err(CoreError::OpenCycleExists)
    }
}

fn parse_custom_crop(crop: Crop, input: Option<&str>) -> Result<Option<String>, FieldIssue> {
    if crop == Crop::Other {
        // `unwrap_or_default` turns a missing value into "", which `required`
        // reports as `required`.
        return text::required("customCrop", input.unwrap_or_default(), CUSTOM_CROP_MAX_CHARS)
            .map(Some);
    }
    match input.map(str::trim) {
        Some(name) if !name.is_empty() => Err(FieldIssue::new("customCrop", IssueCode::NotAllowed)),
        _ => Ok(None),
    }
}

fn parse_variety(input: Option<&str>) -> Result<Option<String>, FieldIssue> {
    text::optional("variety", input, VARIETY_MAX_CHARS)
}

fn parse_planted_on(planted_on: NaiveDate, today: NaiveDate) -> Result<NaiveDate, FieldIssue> {
    let earliest = today.checked_sub_days(Days::new(PLANTED_MAX_DAYS_BEFORE_TODAY));
    let latest = today.checked_add_days(Days::new(PLANTED_MAX_DAYS_AFTER_TODAY));
    // `is_none_or` / `is_some_and` read like the sentence: "no earliest date,
    // or the date is not before it". `None` only happens at chrono's date limits.
    let in_range = earliest.is_none_or(|e| planted_on >= e) && latest.is_none_or(|l| planted_on <= l);
    if in_range {
        Ok(planted_on)
    } else {
        Err(FieldIssue::new("plantedOn", IssueCode::OutOfRange))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn date(y: i32, m: u32, d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    const TODAY: (i32, u32, u32) = (2026, 11, 19);

    fn today() -> NaiveDate {
        date(TODAY.0, TODAY.1, TODAY.2)
    }

    fn days_from_today(days: i64) -> NaiveDate {
        if days >= 0 {
            today() + Days::new(days.unsigned_abs())
        } else {
            today() - Days::new(days.unsigned_abs())
        }
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

    fn new_cycle(
        crop: &str,
        custom: Option<&str>,
        variety: Option<&str>,
        planted: NaiveDate,
    ) -> Result<NewCropCycle, CoreError> {
        NewCropCycle::parse(crop, custom, variety, planted, today())
    }

    #[test]
    fn status_slugs_round_trip() {
        for status in CycleStatus::ALL {
            assert_eq!(CycleStatus::parse_field(status.as_str()), Ok(status));
        }
        for input in ["", "Planned", "open", "done", " active"] {
            assert_eq!(
                CycleStatus::parse_field(input),
                Err(issue("status", IssueCode::InvalidChoice)),
                "input {input:?}"
            );
        }
    }

    #[test]
    fn only_planned_and_active_are_open() {
        assert!(CycleStatus::Planned.is_open());
        assert!(CycleStatus::Active.is_open());
        assert!(!CycleStatus::Harvested.is_open());
        assert!(!CycleStatus::Abandoned.is_open());
    }

    #[test]
    fn initial_status_is_planned_only_after_today() {
        assert_eq!(CycleStatus::initial(days_from_today(1), today()), CycleStatus::Planned);
        assert_eq!(CycleStatus::initial(today(), today()), CycleStatus::Active);
        assert_eq!(CycleStatus::initial(days_from_today(-1), today()), CycleStatus::Active);
    }

    #[test]
    fn status_moves_only_forward() {
        use CycleStatus::{Abandoned, Active, Harvested, Planned};
        let allowed = [
            (Planned, Active),
            (Planned, Abandoned),
            (Active, Harvested),
            (Active, Abandoned),
            // Resending the current status is not a move.
            (Planned, Planned),
            (Active, Active),
            (Harvested, Harvested),
            (Abandoned, Abandoned),
        ];
        for from in CycleStatus::ALL {
            for to in CycleStatus::ALL {
                let expected = if allowed.contains(&(from, to)) {
                    Ok(())
                } else {
                    Err(CoreError::StatusBackwards)
                };
                assert_eq!(from.ensure_can_move_to(to), expected, "{from:?} -> {to:?}");
            }
        }
        // Spelled out: the refused moves.
        assert_eq!(Planned.ensure_can_move_to(Harvested), Err(CoreError::StatusBackwards));
        assert_eq!(Active.ensure_can_move_to(Planned), Err(CoreError::StatusBackwards));
        assert_eq!(Harvested.ensure_can_move_to(Active), Err(CoreError::StatusBackwards));
        assert_eq!(Abandoned.ensure_can_move_to(Active), Err(CoreError::StatusBackwards));
        assert_eq!(Harvested.ensure_can_move_to(Abandoned), Err(CoreError::StatusBackwards));
    }

    #[test]
    fn one_open_cycle_per_plot() {
        assert_eq!(ensure_no_open_cycle(0), Ok(()));
        assert_eq!(ensure_no_open_cycle(1), Err(CoreError::OpenCycleExists));
        assert_eq!(ensure_no_open_cycle(3), Err(CoreError::OpenCycleExists));
    }

    #[test]
    fn new_cycle_keeps_valid_fields() {
        let cycle = new_cycle("maize", None, Some("  H614 "), today()).unwrap();
        assert_eq!(cycle.crop(), Crop::Maize);
        assert_eq!(cycle.custom_crop(), None);
        assert_eq!(cycle.variety(), Some("H614"));
        assert_eq!(cycle.planted_on(), today());
        assert_eq!(cycle.status(), CycleStatus::Active);

        let later = new_cycle("beans", None, None, days_from_today(30)).unwrap();
        assert_eq!(later.status(), CycleStatus::Planned);
        assert_eq!(later.variety(), None);
    }

    #[test]
    fn planted_on_boundaries() {
        for days in [-365, -364, 0, 182, 183] {
            assert!(
                new_cycle("maize", None, None, days_from_today(days)).is_ok(),
                "{days} days"
            );
        }
        for days in [-366, -1000, 184, 400] {
            let err = new_cycle("maize", None, None, days_from_today(days)).unwrap_err();
            assert_eq!(
                issues_of(err),
                vec![issue("plantedOn", IssueCode::OutOfRange)],
                "{days} days"
            );
        }
    }

    #[test]
    fn custom_crop_is_required_for_other() {
        let cycle = new_cycle("other", Some("  Sukuma wiki "), None, today()).unwrap();
        assert_eq!(cycle.crop(), Crop::Other);
        assert_eq!(cycle.custom_crop(), Some("Sukuma wiki"));

        let sixty = "c".repeat(CUSTOM_CROP_MAX_CHARS);
        let cycle = new_cycle("other", Some(&sixty), None, today()).unwrap();
        assert_eq!(cycle.custom_crop(), Some(sixty.as_str()));

        for missing in [None, Some(""), Some("   ")] {
            let err = new_cycle("other", missing, None, today()).unwrap_err();
            assert_eq!(
                issues_of(err),
                vec![issue("customCrop", IssueCode::Required)],
                "{missing:?}"
            );
        }
        let long = "c".repeat(CUSTOM_CROP_MAX_CHARS + 1);
        let err = new_cycle("other", Some(&long), None, today()).unwrap_err();
        assert_eq!(issues_of(err), vec![issue("customCrop", IssueCode::TooLong)]);
    }

    #[test]
    fn custom_crop_is_not_allowed_for_a_catalogue_crop() {
        let err = new_cycle("maize", Some("Corn"), None, today()).unwrap_err();
        assert_eq!(issues_of(err), vec![issue("customCrop", IssueCode::NotAllowed)]);
        // Absent, null or empty is fine and stored as nothing.
        for empty in [None, Some(""), Some("  ")] {
            let cycle = new_cycle("cassava", empty, None, today()).unwrap();
            assert_eq!(cycle.custom_crop(), None, "{empty:?}");
        }
    }

    #[test]
    fn variety_boundaries() {
        let eighty = "v".repeat(VARIETY_MAX_CHARS);
        let cycle = new_cycle("rice", None, Some(&eighty), today()).unwrap();
        assert_eq!(cycle.variety(), Some(eighty.as_str()));
        let long = "v".repeat(VARIETY_MAX_CHARS + 1);
        let err = new_cycle("rice", None, Some(&long), today()).unwrap_err();
        assert_eq!(issues_of(err), vec![issue("variety", IssueCode::TooLong)]);
    }

    #[test]
    fn new_cycle_reports_every_failing_field() {
        let long = "v".repeat(VARIETY_MAX_CHARS + 1);
        let err = new_cycle("other", None, Some(&long), days_from_today(-400)).unwrap_err();
        assert_eq!(
            issues_of(err),
            vec![
                issue("customCrop", IssueCode::Required),
                issue("variety", IssueCode::TooLong),
                issue("plantedOn", IssueCode::OutOfRange),
            ]
        );
        // An unknown crop skips the customCrop rule (it cannot be judged).
        let err = new_cycle("corn", Some("x"), None, days_from_today(200)).unwrap_err();
        assert_eq!(
            issues_of(err),
            vec![
                issue("crop", IssueCode::InvalidChoice),
                issue("plantedOn", IssueCode::OutOfRange),
            ]
        );
    }

    #[test]
    fn changes_check_only_what_was_sent() {
        let empty = CropCycleChanges::parse(None, None, None, today()).unwrap();
        assert_eq!(empty, CropCycleChanges::default());

        let changes = CropCycleChanges::parse(
            Some(Some(" DH04 ")),
            Some(days_from_today(-10)),
            Some("harvested"),
            today(),
        )
        .unwrap();
        assert_eq!(changes.variety(), Some(Some("DH04")));
        assert_eq!(changes.planted_on(), Some(days_from_today(-10)));
        assert_eq!(changes.status(), Some(CycleStatus::Harvested));

        let cleared = CropCycleChanges::parse(Some(None), None, None, today()).unwrap();
        assert_eq!(cleared.variety(), Some(None));
        let emptied = CropCycleChanges::parse(Some(Some(" ")), None, None, today()).unwrap();
        assert_eq!(emptied.variety(), Some(None));
    }

    #[test]
    fn changes_apply_the_same_rules_and_report_every_field() {
        let long = "v".repeat(VARIETY_MAX_CHARS + 1);
        let err = CropCycleChanges::parse(
            Some(Some(&long)),
            Some(days_from_today(184)),
            Some("done"),
            today(),
        )
        .unwrap_err();
        assert_eq!(
            issues_of(err),
            vec![
                issue("variety", IssueCode::TooLong),
                issue("plantedOn", IssueCode::OutOfRange),
                issue("status", IssueCode::InvalidChoice),
            ]
        );
        assert!(CropCycleChanges::parse(None, Some(days_from_today(-365)), None, today()).is_ok());
        assert!(CropCycleChanges::parse(None, Some(days_from_today(-366)), None, today()).is_err());
    }
}
