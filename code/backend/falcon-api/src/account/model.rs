//! Account DTOs.

use falcon_core::Role;
use serde::Serialize;

use crate::http::extract::AuthUser;

/// `GET /api/v1/me` response data: `{ "userId": "user_…", "role": "member" }`.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Me {
    /// Clerk user id.
    pub user_id: String,
    /// `admin` or `member`.
    pub role: Role,
}

impl From<AuthUser> for Me {
    fn from(user: AuthUser) -> Self {
        Self {
            user_id: user.user_id,
            role: user.role,
        }
    }
}
