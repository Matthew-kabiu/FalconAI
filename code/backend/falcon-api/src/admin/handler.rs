//! Admin HTTP handlers. Every handler here takes `AdminUser`.

use axum::response::Response;
use serde::Serialize;

use crate::http::extract::AdminUser;
use crate::http::respond;

/// `GET /api/v1/admin/ping` response data.
#[derive(Debug, Serialize)]
struct Pong {
    ok: bool,
}

/// GET /api/v1/admin/ping — `{ ok: true }` for admins.
///
/// `AdminUser` answers 401 without a valid token and 403 for a non-admin
/// before this runs.
pub async fn ping(_admin: AdminUser) -> Response {
    respond::ok(Pong { ok: true }, "Admin access confirmed")
}
