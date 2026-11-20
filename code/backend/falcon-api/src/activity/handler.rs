//! Activity HTTP handlers. Thin: extract input, call one service method, respond.
//!
//! `AuthUser` comes first in every signature: Axum runs extractors in order,
//! so a request without a valid token gets 401 before its query or body is read.

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::response::Response;

use crate::activity::model::{ActivityInput, ActivityPageMeta, ActivityPatch};
use crate::error::AppError;
use crate::http::extract::{AuthUser, PageQuery, ValidatedJson, ValidatedQuery, parse_id};
use crate::http::respond::{self, Deleted, PageMeta};
use crate::state::AppState;

/// GET /api/v1/crop-cycles/{cycleId}/activities — one page, newest first,
/// with `meta.totalCostKes` (the whole season, not just this page).
pub async fn list(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(cycle_id): Path<String>,
    ValidatedQuery(page): ValidatedQuery<PageQuery>,
) -> Result<Response, AppError> {
    let cycle_id = parse_id(&cycle_id, "crop cycle")?;
    let result = state
        .activities
        .list(&user.user_id, cycle_id, page.offset(), page.per_page())
        .await?;
    let meta = ActivityPageMeta {
        page: PageMeta {
            page: page.page(),
            per_page: page.per_page(),
            total: result.total,
        },
        total_cost_kes: result.total_cost_kes,
    };
    Ok(respond::paged(result.activities, meta, "Activities"))
}

/// POST /api/v1/crop-cycles/{cycleId}/activities — 201 with the new activity.
pub async fn create(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(cycle_id): Path<String>,
    ValidatedJson(input): ValidatedJson<ActivityInput>,
) -> Result<Response, AppError> {
    let cycle_id = parse_id(&cycle_id, "crop cycle")?;
    let activity = state
        .activities
        .create(&user.user_id, cycle_id, &input)
        .await?;
    Ok(respond::created(activity, "Activity logged"))
}

/// PATCH /api/v1/activities/{activityId} — the updated activity.
pub async fn update(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(activity_id): Path<String>,
    ValidatedJson(patch): ValidatedJson<ActivityPatch>,
) -> Result<Response, AppError> {
    let id = parse_id(&activity_id, "activity")?;
    let activity = state.activities.update(&user.user_id, id, &patch).await?;
    Ok(respond::ok(activity, "Activity updated"))
}

/// DELETE /api/v1/activities/{activityId} — `{ id }` of the deleted activity.
pub async fn delete(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(activity_id): Path<String>,
) -> Result<Response, AppError> {
    let id = parse_id(&activity_id, "activity")?;
    state.activities.delete(&user.user_id, id).await?;
    Ok(respond::ok(Deleted { id }, "Activity deleted"))
}
