//! Crop catalogue handler.

use axum::response::Response;
use falcon_core::crop;

use crate::error::AppError;
use crate::http::extract::AuthUser;
use crate::http::respond;

/// GET /api/v1/crops — every crop a farmer can choose, with `hasCalendar`
/// and `healthCheck`. Sign-in required like every `/api/v1` data route.
///
/// `_user` starts with `_` because the handler never reads it: the argument
/// is there only so Axum runs the sign-in check first.
pub async fn list(_user: AuthUser) -> Result<Response, AppError> {
    Ok(respond::ok(crop::catalogue(), "Crops"))
}
