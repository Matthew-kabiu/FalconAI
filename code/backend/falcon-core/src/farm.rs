//! Farm rules: a farm has a name, a county and an optional locality.
//!
//! Like `user.rs`, these are "parse, don't validate" types: the only way to
//! get a [`NewFarm`] or [`FarmChanges`] is through `parse`, so code holding
//! one knows every rule already passed. Unlike `user.rs`, parsing does not stop
//! at the first bad field: every failing field is reported in one
//! [`CoreError::Fields`].
//!
//! Whether the caller owns the farm is not a rule here: ownership needs the
//! database, so `falcon-api` checks it.

use crate::county::County;
use crate::error::{CoreError, FieldIssue, Issues};
use crate::text;

/// Longest farm name, in characters, after trimming.
pub const NAME_MAX_CHARS: usize = 80;
/// Longest locality (village or area), in characters, after trimming.
pub const LOCALITY_MAX_CHARS: usize = 80;

/// A valid new farm.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewFarm {
    name: String,
    county: County,
    locality: Option<String>,
}

impl NewFarm {
    /// Checks every field of a new farm.
    ///
    /// - `name`: trimmed, 1 to 80 characters.
    /// - `county`: one of the 47 county slugs.
    /// - `locality`: optional, trimmed, up to 80 characters; empty becomes `None`.
    ///
    /// # Errors
    /// [`CoreError::Fields`] listing every failing field (`name`, `county`, `locality`).
    pub fn parse(name: &str, county: &str, locality: Option<&str>) -> Result<Self, CoreError> {
        let mut issues = Issues::default();
        let name = issues.check(parse_name(name));
        let county = issues.check(County::parse_field(county));
        let locality = issues.check(parse_locality(locality));

        // All three parsed only if no issue was recorded.
        if let (Some(name), Some(county), Some(locality)) = (name, county, locality) {
            return Ok(Self {
                name,
                county,
                locality,
            });
        }
        Err(issues.into_error())
    }

    /// The trimmed name.
    #[must_use]
    pub fn name(&self) -> &str {
        &self.name
    }

    /// The county.
    #[must_use]
    pub fn county(&self) -> County {
        self.county
    }

    /// The trimmed locality, or `None`.
    #[must_use]
    pub fn locality(&self) -> Option<&str> {
        self.locality.as_deref()
    }
}

/// A valid partial update of a farm. `None` means "leave as is".
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct FarmChanges {
    name: Option<String>,
    county: Option<County>,
    // Two layers of Option: the outer one is "was locality sent at all", the
    // inner one is "set it, or clear it". TypeScript would use
    // `locality?: string | null` for the same idea.
    locality: Option<Option<String>>,
}

impl FarmChanges {
    /// Checks the fields of a partial update. Only fields that are `Some` are
    /// checked, with the same rules as [`NewFarm::parse`]. For `locality`,
    /// `Some(None)` (sent as null) and `Some(Some(""))` both clear it.
    ///
    /// # Errors
    /// [`CoreError::Fields`] listing every failing field.
    pub fn parse(
        name: Option<&str>,
        county: Option<&str>,
        locality: Option<Option<&str>>,
    ) -> Result<Self, CoreError> {
        let mut issues = Issues::default();
        // `transpose` flips Option<Result<T, E>> into Result<Option<T>, E>,
        // so "not sent" stays Ok(None) and only a sent value can fail.
        let name = issues.check(name.map(parse_name).transpose());
        let county = issues.check(county.map(County::parse_field).transpose());
        let locality = issues.check(locality.map(parse_locality).transpose());

        if let (Some(name), Some(county), Some(locality)) = (name, county, locality) {
            return Ok(Self {
                name,
                county,
                locality,
            });
        }
        Err(issues.into_error())
    }

    /// The new name, if it changes.
    #[must_use]
    pub fn name(&self) -> Option<&str> {
        self.name.as_deref()
    }

    /// The new county, if it changes.
    #[must_use]
    pub fn county(&self) -> Option<County> {
        self.county
    }

    /// `None`: leave the locality. `Some(None)`: clear it. `Some(Some(x))`: set it.
    #[must_use]
    pub fn locality(&self) -> Option<Option<&str>> {
        self.locality.as_ref().map(Option::as_deref)
    }
}

/// A farm with plots cannot be deleted: its plots would lose their farm.
///
/// # Errors
/// [`CoreError::FarmHasPlots`] when `plot_count` is above zero.
pub fn ensure_deletable(plot_count: u64) -> Result<(), CoreError> {
    if plot_count == 0 {
        Ok(())
    } else {
        Err(CoreError::FarmHasPlots)
    }
}

fn parse_name(input: &str) -> Result<String, FieldIssue> {
    text::required("name", input, NAME_MAX_CHARS)
}

fn parse_locality(input: Option<&str>) -> Result<Option<String>, FieldIssue> {
    text::optional("locality", input, LOCALITY_MAX_CHARS)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::IssueCode;

    fn issues_of(err: CoreError) -> Vec<FieldIssue> {
        match err {
            CoreError::Fields(issues) => issues,
            other => panic!("expected CoreError::Fields, got {other:?}"),
        }
    }

    fn issue(field: &str, code: IssueCode) -> FieldIssue {
        FieldIssue::new(field, code)
    }

    #[test]
    fn new_farm_trims_and_keeps_valid_fields() {
        let farm = NewFarm::parse("  Home farm ", "kiambu", Some("  Gatundu ")).unwrap();
        assert_eq!(farm.name(), "Home farm");
        assert_eq!(farm.county(), County::Kiambu);
        assert_eq!(farm.locality(), Some("Gatundu"));
    }

    #[test]
    fn new_farm_locality_is_optional_and_empty_becomes_none() {
        for locality in [None, Some(""), Some("   ")] {
            let farm = NewFarm::parse("Home farm", "homa-bay", locality).unwrap();
            assert_eq!(farm.locality(), None, "locality {locality:?}");
        }
    }

    #[test]
    fn new_farm_name_boundaries() {
        assert_eq!(NewFarm::parse("A", "embu", None).unwrap().name(), "A");
        let eighty = "n".repeat(NAME_MAX_CHARS);
        assert_eq!(
            NewFarm::parse(&eighty, "embu", None).unwrap().name(),
            eighty
        );
        // 80 characters plus surrounding spaces is still 80 after trimming.
        let padded = format!("  {eighty}  ");
        assert!(NewFarm::parse(&padded, "embu", None).is_ok());

        let err = NewFarm::parse(&"n".repeat(NAME_MAX_CHARS + 1), "embu", None).unwrap_err();
        assert_eq!(issues_of(err), vec![issue("name", IssueCode::TooLong)]);
        for empty in ["", "   ", "\t\n"] {
            let err = NewFarm::parse(empty, "embu", None).unwrap_err();
            assert_eq!(issues_of(err), vec![issue("name", IssueCode::Required)]);
        }
    }

    #[test]
    fn new_farm_locality_boundaries() {
        let eighty = "l".repeat(LOCALITY_MAX_CHARS);
        let farm = NewFarm::parse("F", "embu", Some(&eighty)).unwrap();
        assert_eq!(farm.locality(), Some(eighty.as_str()));

        let long = "l".repeat(LOCALITY_MAX_CHARS + 1);
        let err = NewFarm::parse("F", "embu", Some(&long)).unwrap_err();
        assert_eq!(issues_of(err), vec![issue("locality", IssueCode::TooLong)]);
    }

    #[test]
    fn new_farm_refuses_an_unknown_county() {
        for county in ["", "Kiambu", "atlantis", " kiambu"] {
            let err = NewFarm::parse("F", county, None).unwrap_err();
            assert_eq!(
                issues_of(err),
                vec![issue("county", IssueCode::InvalidChoice)],
                "county {county:?}"
            );
        }
    }

    #[test]
    fn new_farm_reports_every_failing_field() {
        let long = "x".repeat(81);
        let err = NewFarm::parse(" ", "nowhere", Some(&long)).unwrap_err();
        assert_eq!(
            issues_of(err),
            vec![
                issue("name", IssueCode::Required),
                issue("county", IssueCode::InvalidChoice),
                issue("locality", IssueCode::TooLong),
            ]
        );
    }

    #[test]
    fn changes_check_only_what_was_sent() {
        let empty = FarmChanges::parse(None, None, None).unwrap();
        assert_eq!(empty, FarmChanges::default());
        assert_eq!(empty.name(), None);
        assert_eq!(empty.county(), None);
        assert_eq!(empty.locality(), None);

        let changes = FarmChanges::parse(Some(" New name "), Some("nakuru"), None).unwrap();
        assert_eq!(changes.name(), Some("New name"));
        assert_eq!(changes.county(), Some(County::Nakuru));
        assert_eq!(changes.locality(), None);
    }

    #[test]
    fn changes_locality_can_be_set_or_cleared() {
        let set = FarmChanges::parse(None, None, Some(Some(" Njoro "))).unwrap();
        assert_eq!(set.locality(), Some(Some("Njoro")));
        let cleared = FarmChanges::parse(None, None, Some(None)).unwrap();
        assert_eq!(cleared.locality(), Some(None));
        let emptied = FarmChanges::parse(None, None, Some(Some("  "))).unwrap();
        assert_eq!(emptied.locality(), Some(None));
    }

    #[test]
    fn changes_apply_the_same_rules_and_report_every_field() {
        let long = "x".repeat(81);
        let err = FarmChanges::parse(Some(""), Some("Nakuru"), Some(Some(&long))).unwrap_err();
        assert_eq!(
            issues_of(err),
            vec![
                issue("name", IssueCode::Required),
                issue("county", IssueCode::InvalidChoice),
                issue("locality", IssueCode::TooLong),
            ]
        );
        let err = FarmChanges::parse(Some(&long), None, None).unwrap_err();
        assert_eq!(issues_of(err), vec![issue("name", IssueCode::TooLong)]);
    }

    #[test]
    fn only_a_farm_without_plots_can_be_deleted() {
        assert_eq!(ensure_deletable(0), Ok(()));
        assert_eq!(ensure_deletable(1), Err(CoreError::FarmHasPlots));
        assert_eq!(ensure_deletable(250), Err(CoreError::FarmHasPlots));
    }
}
