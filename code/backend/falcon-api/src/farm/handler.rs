//! Farm HTTP handlers. Thin: extract input, call one service method, respond.
//!
//! `AuthUser` comes first in every signature: Axum runs extractors in order,
//! so a request without a valid token gets 401 before its query or body is read.

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::response::Response;

use crate::error::AppError;
use crate::farm::model::{FarmInput, FarmPatch};
use crate::http::extract::{AuthUser, PageQuery, ValidatedJson, ValidatedQuery, parse_id};
use crate::http::respond::{self, Deleted, PageMeta};
use crate::state::AppState;

/// GET /api/v1/farms — one page of the caller's farms, with `meta`.
pub async fn list(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    ValidatedQuery(page): ValidatedQuery<PageQuery>,
) -> Result<Response, AppError> {
    let (farms, total) = state
        .farms
        .list(&user.user_id, page.offset(), page.per_page())
        .await?;
    let meta = PageMeta {
        page: page.page(),
        per_page: page.per_page(),
        total,
    };
    Ok(respond::paged(farms, meta, "Farms"))
}

/// POST /api/v1/farms — 201 with the new farm.
pub async fn create(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    ValidatedJson(input): ValidatedJson<FarmInput>,
) -> Result<Response, AppError> {
    let farm = state.farms.create(&user.user_id, &input).await?;
    Ok(respond::created(farm, "Farm created"))
}

/// GET /api/v1/farms/{farmId} — the farm and all its plots.
pub async fn get(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(farm_id): Path<String>,
) -> Result<Response, AppError> {
    let id = parse_id(&farm_id, "farm")?;
    let detail = state.farms.get(&user.user_id, id).await?;
    Ok(respond::ok(detail, "Farm"))
}

/// PATCH /api/v1/farms/{farmId} — the updated farm.
pub async fn update(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(farm_id): Path<String>,
    ValidatedJson(patch): ValidatedJson<FarmPatch>,
) -> Result<Response, AppError> {
    let id = parse_id(&farm_id, "farm")?;
    let farm = state.farms.update(&user.user_id, id, &patch).await?;
    Ok(respond::ok(farm, "Farm updated"))
}

/// DELETE /api/v1/farms/{farmId} — `{ id }`; 409 while it has plots.
pub async fn delete(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(farm_id): Path<String>,
) -> Result<Response, AppError> {
    let id = parse_id(&farm_id, "farm")?;
    state.farms.delete(&user.user_id, id).await?;
    Ok(respond::ok(Deleted { id }, "Farm deleted"))
}
