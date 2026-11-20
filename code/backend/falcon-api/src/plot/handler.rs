//! Plot HTTP handlers. Thin: extract input, call one service method, respond.
//!
//! `AuthUser` comes first in every signature: Axum runs extractors in order,
//! so a request without a valid token gets 401 before its body is read.

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::response::Response;

use crate::error::AppError;
use crate::http::extract::{AuthUser, ValidatedJson, parse_id};
use crate::http::respond::{self, Deleted};
use crate::plot::model::{PlotInput, PlotPatch};
use crate::state::AppState;

/// POST /api/v1/farms/{farmId}/plots — 201 with the new plot.
pub async fn create(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(farm_id): Path<String>,
    ValidatedJson(input): ValidatedJson<PlotInput>,
) -> Result<Response, AppError> {
    let farm_id = parse_id(&farm_id, "farm")?;
    let plot = state.plots.create(&user.user_id, farm_id, &input).await?;
    Ok(respond::created(plot, "Plot created"))
}

/// PATCH /api/v1/plots/{plotId} — the updated plot.
pub async fn update(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(plot_id): Path<String>,
    ValidatedJson(patch): ValidatedJson<PlotPatch>,
) -> Result<Response, AppError> {
    let plot_id = parse_id(&plot_id, "plot")?;
    let plot = state.plots.update(&user.user_id, plot_id, &patch).await?;
    Ok(respond::ok(plot, "Plot updated"))
}

/// DELETE /api/v1/plots/{plotId} — `{ id }` of the deleted plot.
pub async fn delete(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(plot_id): Path<String>,
) -> Result<Response, AppError> {
    let id = parse_id(&plot_id, "plot")?;
    state.plots.delete(&user.user_id, id).await?;
    Ok(respond::ok(Deleted { id }, "Plot deleted"))
}
