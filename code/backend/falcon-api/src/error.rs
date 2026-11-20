//! The one error type for request code (template §8).
//!
//! Express needs `asyncHandler` + an error middleware. In Axum a handler returns
//! `Result<T, AppError>`; `AppError` implements `IntoResponse`, so Axum turns any
//! `Err` into the error envelope here. `?` is "rethrow upward" in one character.

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use falcon_core::CoreError;
use serde::Serialize;

use crate::http::respond;

/// One invalid input field, as reported to the client.
#[derive(Debug, Clone, Serialize)]
pub struct FieldError {
    /// Field name as the client sent it.
    pub field: String,
    /// Why the value was rejected.
    pub message: String,
}

/// Every way a request can fail. Each variant maps to one status and code.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    /// Malformed or invalid request input (400).
    #[error("{0}")]
    Validation(String),
    /// Several invalid fields (400).
    #[error("{}", join_fields(.0))]
    ValidationFields(Vec<FieldError>),
    /// A `falcon-core` domain rule failed. SOP addendum §8: a core
    /// validation failure becomes a 422 response (with `errors` listing each
    /// refused field for [`CoreError::Fields`]); a refused state change
    /// becomes a 409 with its own code (`FARM_HAS_PLOTS`, `PLOT_HAS_CROPS`,
    /// `OPEN_CYCLE_EXISTS`, `STATUS_BACKWARDS`).
    #[error("{0}")]
    Domain(#[from] CoreError),
    /// Not signed in (401).
    #[error("unauthorized")]
    Unauthorized,
    /// Signed in but not allowed (403).
    #[error("forbidden")]
    Forbidden,
    /// The named resource does not exist (404).
    #[error("{0} not found")]
    NotFound(&'static str),
    /// The request conflicts with current state (409).
    #[error("{0}")]
    Conflict(String),
    /// Too many requests (429).
    #[error("rate limited")]
    RateLimited,
    /// A dependency this request needs is down, e.g. Clerk's signing keys
    /// could not be fetched (503). The cause is logged where it happens.
    #[error("Service temporarily unavailable")]
    Unavailable,
    /// Anything unexpected (500). The cause is logged, NEVER serialized.
    #[error("internal error")]
    Internal(#[from] anyhow::Error),
}

// Database errors become Internal automatically, so `?` works in repositories.
impl From<sea_orm::DbErr> for AppError {
    fn from(e: sea_orm::DbErr) -> Self {
        AppError::Internal(e.into())
    }
}

impl AppError {
    fn code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::Validation(_) | Self::ValidationFields(_) => {
                (StatusCode::BAD_REQUEST, "VALIDATION_ERROR")
            }
            Self::Domain(CoreError::Validation { .. } | CoreError::Fields(_)) => {
                (StatusCode::UNPROCESSABLE_ENTITY, "VALIDATION_ERROR")
            }
            Self::Domain(CoreError::FarmHasPlots) => (StatusCode::CONFLICT, "FARM_HAS_PLOTS"),
            Self::Domain(CoreError::PlotHasCrops) => (StatusCode::CONFLICT, "PLOT_HAS_CROPS"),
            Self::Domain(CoreError::OpenCycleExists) => {
                (StatusCode::CONFLICT, "OPEN_CYCLE_EXISTS")
            }
            Self::Domain(CoreError::StatusBackwards) => (StatusCode::CONFLICT, "STATUS_BACKWARDS"),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "UNAUTHORIZED"),
            Self::Forbidden => (StatusCode::FORBIDDEN, "FORBIDDEN"),
            Self::NotFound(_) => (StatusCode::NOT_FOUND, "NOT_FOUND"),
            Self::Conflict(_) => (StatusCode::CONFLICT, "CONFLICT"),
            Self::RateLimited => (StatusCode::TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED"),
            Self::Unavailable => (StatusCode::SERVICE_UNAVAILABLE, "SERVICE_UNAVAILABLE"),
            Self::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR"),
        }
    }
}

// This is the whole "central error mapper". Axum calls it for any handler that returns Err.
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code) = self.code();
        let message = match &self {
            Self::Internal(cause) => {
                tracing::error!(error = ?cause, "request failed"); // full cause: logs only
                "An unexpected error occurred".to_string()
            }
            other => other.to_string(),
        };
        // `self` is moved into the match so the issue list is handed over
        // without a copy; `message` was already built from a borrow above.
        match self {
            Self::Domain(CoreError::Fields(issues)) => {
                respond::error_with_fields(status, code, message, issues)
            }
            _ => respond::error(status, code, message),
        }
    }
}

fn join_fields(fields: &[FieldError]) -> String {
    fields
        .iter()
        .map(|f| format!("{}: {}", f.field, f.message))
        .collect::<Vec<_>>()
        .join("; ")
}
