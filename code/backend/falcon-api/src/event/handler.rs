//! Event HTTP handlers. Thin: extract input, call one service method, respond.
//!
//! `AuthUser` comes first in every signature: Axum runs extractors in order,
//! so a request without a valid token gets 401 before its body is read.

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::response::Response;

use crate::error::AppError;
use crate::event::model::{EventInput, EventPatch};
use crate::http::extract::{AuthUser, ValidatedJson, parse_id};
use crate::http::respond;
use crate::state::AppState;

/// POST /api/v1/events — 201 with the new event.
pub async fn create(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    ValidatedJson(input): ValidatedJson<EventInput>,
) -> Result<Response, AppError> {
    let event = state.events.create(&user.user_id, &input).await?;
    Ok(respond::created(event, "Event added"))
}

/// GET /api/v1/events/{eventId} — one of the caller's events.
pub async fn get(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(event_id): Path<String>,
) -> Result<Response, AppError> {
    let id = parse_id(&event_id, "event")?;
    let event = state.events.get(&user.user_id, id).await?;
    Ok(respond::ok(event, "Event"))
}

/// PATCH /api/v1/events/{eventId} — the updated event.
pub async fn update(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(event_id): Path<String>,
    ValidatedJson(patch): ValidatedJson<EventPatch>,
) -> Result<Response, AppError> {
    let id = parse_id(&event_id, "event")?;
    let event = state.events.update(&user.user_id, id, &patch).await?;
    Ok(respond::ok(event, "Event updated"))
}

/// DELETE /api/v1/events/{eventId} — 204, no body.
pub async fn delete(
    State(state): State<Arc<AppState>>,
    user: AuthUser,
    Path(event_id): Path<String>,
) -> Result<Response, AppError> {
    let id = parse_id(&event_id, "event")?;
    state.events.delete(&user.user_id, id).await?;
    Ok(respond::no_content())
}
