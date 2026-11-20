//! `GET /api/health` — used by Docker, Coolify and the load balancer (template §14).

use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::Response;
use serde::Serialize;

use crate::db;
use crate::http::respond;
use crate::state::AppState;

/// Health report returned in the envelope's `data`.
#[derive(Serialize)]
struct Report {
    status: &'static str,
    database: &'static str,
}

/// GET /api/health — 200 when the database answers, 503 when it does not.
///
/// Returns `Response` rather than `Result<_, AppError>` because a down
/// database is a normal answer here, not a request failure.
pub async fn check(State(state): State<Arc<AppState>>) -> Response {
    match db::ping(&state.db).await {
        Ok(()) => respond::ok(
            Report {
                status: "ok",
                database: "ok",
            },
            "Service healthy",
        ),
        Err(e) => {
            tracing::warn!(error = %e, "health check: database unreachable");
            respond::with_status(
                StatusCode::SERVICE_UNAVAILABLE,
                false,
                Report {
                    status: "degraded",
                    database: "down",
                },
                "Database unavailable",
            )
        }
    }
}
