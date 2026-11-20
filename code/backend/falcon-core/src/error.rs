//! The core's own error type.
//!
//! In TypeScript you would `throw new ValidationError(...)`. In Rust a failing
//! rule returns `Err(CoreError::Validation { .. })` as an ordinary value, and the
//! caller decides what to do with it. `falcon-api` turns it into a 422 response.

use serde::Serialize;

/// An error raised by a domain rule.
///
/// `thiserror` writes the `Display` and `std::error::Error` impls for us,
/// which is what makes this enum usable with `?` and in error chains.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum CoreError {
    /// Input broke a domain rule (for example a planting date after harvest).
    #[error("{field}: {message}")]
    Validation {
        /// The input field that broke the rule, as the client named it.
        field: String,
        /// A human-readable explanation, safe to show to the farmer.
        message: String,
    },
    /// One or more input fields broke a rule. Every failing field is listed,
    /// not just the first, so a form can mark them all at once.
    ///
    /// The `Display` text is `name: too_long; county: invalid_choice`.
    #[error("{}", join_issues(.0))]
    Fields(Vec<FieldIssue>),
    /// A farm cannot be deleted while it still has plots.
    #[error("Remove this farm's plots before deleting it.")]
    FarmHasPlots,
    /// A plot cannot be deleted while it has crop cycles: they are the
    /// farmer's season history and would lose their plot.
    #[error("This plot has crop records, so it cannot be deleted.")]
    PlotHasCrops,
    /// A plot already has a planned or active crop cycle; only one may be
    /// open at a time.
    #[error("This plot already has a planned or active crop.")]
    OpenCycleExists,
    /// A crop cycle's status may only move forward
    /// (planned → active → harvested or abandoned, or planned → abandoned).
    #[error("A crop cycle's status can only move forward.")]
    StatusBackwards,
}

impl CoreError {
    /// Builds a [`CoreError::Validation`] for `field` with a farmer-safe message.
    #[must_use]
    pub fn validation(field: &str, message: impl Into<String>) -> Self {
        Self::Validation {
            field: field.to_string(),
            message: message.into(),
        }
    }
}

/// Why a field was refused: a stable machine code the clients translate.
///
/// Serialised in snake_case (`too_long`), the wire form in `api/openapi.yaml`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum IssueCode {
    /// Missing, or empty after trimming.
    Required,
    /// Longer than the field allows.
    TooLong,
    /// A number outside its allowed range.
    OutOfRange,
    /// Not one of the allowed values.
    InvalidChoice,
    /// A value given where it must not be, e.g. `customCrop` on a catalogue
    /// crop, or a quantity without a unit.
    NotAllowed,
}

impl IssueCode {
    /// The wire name, e.g. `too_long`.
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Required => "required",
            Self::TooLong => "too_long",
            Self::OutOfRange => "out_of_range",
            Self::InvalidChoice => "invalid_choice",
            Self::NotAllowed => "not_allowed",
        }
    }
}

/// One refused field: `{ "field": "name", "code": "too_long" }`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct FieldIssue {
    /// The input field, as the client named it (`sizeUnit`, not `size_unit`).
    pub field: String,
    /// Why it was refused.
    pub code: IssueCode,
}

impl FieldIssue {
    /// Builds an issue for `field`.
    #[must_use]
    pub fn new(field: &str, code: IssueCode) -> Self {
        Self {
            field: field.to_string(),
            code,
        }
    }
}

fn join_issues(issues: &[FieldIssue]) -> String {
    issues
        .iter()
        .map(|i| format!("{}: {}", i.field, i.code.as_str()))
        .collect::<Vec<_>>()
        .join("; ")
}

/// Collects field issues while an input is parsed field by field, so every
/// failing field is reported together instead of stopping at the first.
///
/// `pub(crate)`: a tool for the parsers in this crate, not part of the API.
#[derive(Debug, Default)]
pub(crate) struct Issues(Vec<FieldIssue>);

impl Issues {
    /// Keeps the value if the field parsed; records the issue if not.
    ///
    /// Returns `Option` so the caller can carry on with the next field either
    /// way (where TypeScript would push to an array inside a `try/catch`).
    pub(crate) fn check<T>(&mut self, result: Result<T, FieldIssue>) -> Option<T> {
        match result {
            Ok(value) => Some(value),
            Err(issue) => {
                self.0.push(issue);
                None
            }
        }
    }

    /// Records an issue found by a rule that spans several fields (e.g. a
    /// quantity without its unit).
    pub(crate) fn push(&mut self, issue: FieldIssue) {
        self.0.push(issue);
    }

    /// True when no issue has been recorded yet.
    pub(crate) fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    /// The collected issues as a [`CoreError::Fields`].
    pub(crate) fn into_error(self) -> CoreError {
        CoreError::Fields(self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn issue_codes_have_stable_wire_names() {
        assert_eq!(IssueCode::Required.as_str(), "required");
        assert_eq!(IssueCode::TooLong.as_str(), "too_long");
        assert_eq!(IssueCode::OutOfRange.as_str(), "out_of_range");
        assert_eq!(IssueCode::InvalidChoice.as_str(), "invalid_choice");
        assert_eq!(IssueCode::NotAllowed.as_str(), "not_allowed");
    }

    #[test]
    fn fields_error_lists_every_issue() {
        let err = CoreError::Fields(vec![
            FieldIssue::new("name", IssueCode::TooLong),
            FieldIssue::new("county", IssueCode::InvalidChoice),
        ]);
        assert_eq!(err.to_string(), "name: too_long; county: invalid_choice");
    }

    #[test]
    fn validation_keeps_its_old_shape() {
        let err = CoreError::validation("phone", "Enter a phone number");
        assert_eq!(err.to_string(), "phone: Enter a phone number");
    }
}
