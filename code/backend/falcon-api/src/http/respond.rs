//! Response envelope helpers (template §5.4). Same shape as the Node and Go
//! templates, so clients are portable across all three.
//!
//! ```json
//! // Success
//! { "success": true, "message": "...", "data": {} }
//! // Error — never a stack trace, never an internal message in production
//! { "success": false, "error": "VALIDATION_ERROR", "message": "...",
//!   "statusCode": 400, "timestamp": "...", "path": "/api/v1/...", "requestId": "..." }
//! ```
//!
//! A paginated list adds `meta: { page, perPage, total }` (see [`paged`]).
//! A 422 adds `errors: [{ field, code }]`, one entry per refused field.

use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use falcon_core::FieldIssue;
use sea_orm::prelude::Uuid;
use serde::Serialize;

/// Success-shaped envelope: `{ success, message, data, meta? }`.
///
/// `M = PageMeta` is a default type parameter: plain `Envelope<T>` means
/// paging meta, and a list with extra totals (activities) can pass its own.
#[derive(Serialize)]
struct Envelope<T, M = PageMeta> {
    success: bool,
    message: String,
    data: T,
    // `skip_serializing_if` leaves the key out entirely when `None`, so
    // responses without paging look exactly as they did before `meta` existed.
    #[serde(skip_serializing_if = "Option::is_none")]
    meta: Option<M>,
}

/// Paging details of a list response: `{ page, perPage, total }`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PageMeta {
    /// The page returned, from 1.
    pub page: u64,
    /// Items per page.
    pub per_page: u64,
    /// Items across all pages.
    pub total: u64,
}

/// `data` of a successful `DELETE`: `{ "id": "…" }` (`Deleted` in the contract).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct Deleted {
    /// The id that was deleted.
    pub id: Uuid,
}

/// Error envelope. It also rides on the response as an extension so the
/// `error_context` middleware can fill in `path` and `requestId`, which the
/// code that builds an error (e.g. `AppError::into_response`) cannot see.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorEnvelope {
    success: bool,
    error: &'static str,
    message: String,
    status_code: u16,
    timestamp: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    request_id: Option<String>,
    /// Present only on a 422 from a `falcon-core` rule: every refused field.
    #[serde(skip_serializing_if = "Option::is_none")]
    errors: Option<Vec<FieldIssue>>,
}

impl ErrorEnvelope {
    /// Returns a copy with the request path and request ID filled in.
    #[must_use]
    pub fn with_request(mut self, path: String, request_id: Option<String>) -> Self {
        self.path = Some(path);
        self.request_id = request_id;
        self
    }
}

/// 200 OK with `{ success: true, message, data }`.
pub fn ok<T: Serialize>(data: T, message: &str) -> Response {
    with_status(StatusCode::OK, true, data, message)
}

/// 201 Created with `{ success: true, message, data }`.
pub fn created<T: Serialize>(data: T, message: &str) -> Response {
    with_status(StatusCode::CREATED, true, data, message)
}

/// 204 No Content: no body at all (a `DELETE` whose contract says 204).
pub fn no_content() -> Response {
    StatusCode::NO_CONTENT.into_response()
}

/// 200 OK with `{ success: true, message, data, meta }` for one page of a list.
/// `meta` is usually [`PageMeta`]; any serialisable meta that embeds it works
/// (the activity list adds `totalCostKes`).
pub fn paged<T: Serialize, M: Serialize>(data: T, meta: M, message: &str) -> Response {
    let body = Envelope {
        success: true,
        message: message.to_string(),
        data,
        meta: Some(meta),
    };
    (StatusCode::OK, Json(body)).into_response()
}

/// Any status with the success-shaped envelope. Used where a response carries
/// data but is not a success, e.g. the health check's 503.
pub fn with_status<T: Serialize>(
    status: StatusCode,
    success: bool,
    data: T,
    message: &str,
) -> Response {
    // The turbofish `::<T, PageMeta>` names the meta type, which `None`
    // alone does not tell the compiler.
    let body = Envelope::<T, PageMeta> {
        success,
        message: message.to_string(),
        data,
        meta: None,
    };
    (status, Json(body)).into_response()
}

/// The error envelope. Never pass an internal error message here.
pub fn error(status: StatusCode, code: &'static str, message: String) -> Response {
    build_error(status, code, message, None)
}

/// The error envelope plus `errors`, the list of refused fields (the 422 for
/// a broken `falcon-core` rule).
pub fn error_with_fields(
    status: StatusCode,
    code: &'static str,
    message: String,
    errors: Vec<FieldIssue>,
) -> Response {
    build_error(status, code, message, Some(errors))
}

fn build_error(
    status: StatusCode,
    code: &'static str,
    message: String,
    errors: Option<Vec<FieldIssue>>,
) -> Response {
    let envelope = ErrorEnvelope {
        success: false,
        error: code,
        message,
        status_code: status.as_u16(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        path: None,
        request_id: None,
        errors,
    };
    let mut response = (status, Json(envelope.clone())).into_response();
    // The clone is the copy the middleware reads back; the body owns the other.
    response.extensions_mut().insert(envelope);
    response
}
