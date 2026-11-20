//! Farm-calendar HTTP handler. Thin: extract input, call one service method, respond.
//!
//! `AuthUser` comes first: Axum runs extractors in order, so a request
//! without a valid token gets 401 before its query is read.

use std::sync::Arc;

use axum::extract::State;
use axum::response::Response;

use crate::calendar::model::CalendarQuery;
use crate::error::AppError;
use crate::http::extract::{AuthUser, ValidatedQuery};
use crate::http::respond;
use crate::state::AppState;

/// GET /api/v1/calendar — the caller's whole-farm calendar for `?from=&to=`
/// (default: 14 days ago to 60 days ahead, Kenya date).
pub async fn get(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    ValidatedQuery(query): ValidatedQuery<CalendarQuery>,
) -> Result<Response, AppError> {
    let calendar = state
        .calendar
        .farm(&user.user_id, query.from, query.to)
        .await?;
    Ok(respond::ok(calendar, "Farm calendar"))
}
