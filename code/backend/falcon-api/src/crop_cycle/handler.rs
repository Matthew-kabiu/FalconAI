//! Crop-cycle HTTP handlers. Thin: extract input, call one service method, respond.
//!
//! `AuthUser` comes first in every signature: Axum runs extractors in order,
//! so a request without a valid token gets 401 before its query or body is read.

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::response::Response;

use crate::crop_cycle::model::{CropCycleInput, CropCyclePatch, CycleListQuery};
use crate::error::AppError;
use crate::http::extract::{AuthUser, PageQuery, ValidatedJson, ValidatedQuery, parse_id};
use crate::http::respond::{self, PageMeta};
use crate::state::AppState;

/// GET /api/v1/crop-cycles — one page of the caller's cycles, with `meta`.
/// `?status=open|closed` narrows it.
pub async fn list(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    ValidatedQuery(page): ValidatedQuery<PageQuery>,
    ValidatedQuery(filter): ValidatedQuery<CycleListQuery>,
) -> Result<Response, AppError> {
    let (cycles, total) = state
        .crop_cycles
        .list(&user.user_id, filter.status, page.offset(), page.per_page())
        .await?;
    let meta = PageMeta {
        page: page.page(),
        per_page: page.per_page(),
        total,
    };
    Ok(respond::paged(cycles, meta, "Crop cycles"))
}

/// GET /api/v1/plots/{plotId}/crop-cycles — all of one plot's cycles.
pub async fn list_for_plot(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(plot_id): Path<String>,
) -> Result<Response, AppError> {
    let plot_id = parse_id(&plot_id, "plot")?;
    let cycles = state.crop_cycles.list_for_plot(&user.user_id, plot_id).await?;
    Ok(respond::ok(cycles, "Crop cycles"))
}

/// POST /api/v1/plots/{plotId}/crop-cycles — 201 with the new cycle.
pub async fn create(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(plot_id): Path<String>,
    ValidatedJson(input): ValidatedJson<CropCycleInput>,
) -> Result<Response, AppError> {
    let plot_id = parse_id(&plot_id, "plot")?;
    let cycle = state
        .crop_cycles
        .create(&user.user_id, plot_id, &input)
        .await?;
    Ok(respond::created(cycle, "Crop cycle started"))
}

/// GET /api/v1/crop-cycles/{cycleId} — the cycle, its season cost and calendar.
pub async fn get(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(cycle_id): Path<String>,
) -> Result<Response, AppError> {
    let id = parse_id(&cycle_id, "crop cycle")?;
    let detail = state.crop_cycles.get(&user.user_id, id).await?;
    Ok(respond::ok(detail, "Crop cycle"))
}

/// PATCH /api/v1/crop-cycles/{cycleId} — the updated cycle.
pub async fn update(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(cycle_id): Path<String>,
    ValidatedJson(patch): ValidatedJson<CropCyclePatch>,
) -> Result<Response, AppError> {
    let id = parse_id(&cycle_id, "crop cycle")?;
    let cycle = state.crop_cycles.update(&user.user_id, id, &patch).await?;
    Ok(respond::ok(cycle, "Crop cycle updated"))
}
