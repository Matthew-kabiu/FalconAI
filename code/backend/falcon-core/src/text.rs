//! Free-text field rules shared by farms and plots: trim, then check length.
//!
//! Lengths are counted in characters (Unicode scalar values), not bytes, so a
//! name with accented letters is not cut short. `str::len()` in Rust counts
//! bytes, unlike JavaScript's `.length` (UTF-16 units), hence `chars().count()`.

use crate::error::{FieldIssue, IssueCode};

/// A required text field: trimmed, 1 to `max` characters.
pub(crate) fn required(field: &str, input: &str, max: usize) -> Result<String, FieldIssue> {
    let trimmed = input.trim();
    let len = trimmed.chars().count();
    if len == 0 {
        return Err(FieldIssue::new(field, IssueCode::Required));
    }
    if len > max {
        return Err(FieldIssue::new(field, IssueCode::TooLong));
    }
    Ok(trimmed.to_string())
}

/// An optional text field: trimmed, up to `max` characters. Missing, null and
/// empty-after-trimming all become `None`, so the database never stores `""`.
pub(crate) fn optional(
    field: &str,
    input: Option<&str>,
    max: usize,
) -> Result<Option<String>, FieldIssue> {
    let trimmed = input.map(str::trim).unwrap_or_default();
    if trimmed.is_empty() {
        return Ok(None);
    }
    if trimmed.chars().count() > max {
        return Err(FieldIssue::new(field, IssueCode::TooLong));
    }
    Ok(Some(trimmed.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn required_trims_and_bounds() {
        assert_eq!(required("name", "  Shamba  ", 80).unwrap(), "Shamba");
        assert_eq!(required("name", "A", 80).unwrap(), "A");
        let eighty = "é".repeat(80); // 80 chars, 160 bytes
        assert_eq!(required("name", &eighty, 80).unwrap(), eighty);
        assert_eq!(
            required("name", "", 80).unwrap_err(),
            FieldIssue::new("name", IssueCode::Required)
        );
        assert_eq!(
            required("name", " \t\n ", 80).unwrap_err().code,
            IssueCode::Required
        );
        assert_eq!(
            required("name", &"a".repeat(81), 80).unwrap_err().code,
            IssueCode::TooLong
        );
    }

    #[test]
    fn optional_empties_become_none() {
        assert_eq!(optional("notes", None, 500).unwrap(), None);
        assert_eq!(optional("notes", Some(""), 500).unwrap(), None);
        assert_eq!(optional("notes", Some("   "), 500).unwrap(), None);
        assert_eq!(
            optional("notes", Some(" red soil "), 500).unwrap().as_deref(),
            Some("red soil")
        );
        assert_eq!(
            optional("notes", Some(&"a".repeat(501)), 500)
                .unwrap_err()
                .code,
            IssueCode::TooLong
        );
    }
}
