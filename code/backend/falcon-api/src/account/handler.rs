//! Account HTTP handlers.

use axum::response::Response;

use crate::account::model::Me;
use crate::http::extract::AuthUser;
use crate::http::respond;

/// GET /api/v1/me — who the bearer token belongs to, and their role.
///
/// The `AuthUser` argument answers 401 before this runs if the token is
/// missing or invalid.
pub async fn me(user: AuthUser) -> Response {
    respond::ok(Me::from(user), "Signed in")
}
