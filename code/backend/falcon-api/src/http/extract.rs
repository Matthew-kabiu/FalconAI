//! Custom extractors (template §10.2).
//!
//! An extractor is a handler argument that Axum fills from the request. If it
//! fails, the handler body never runs and the client gets the rejection —
//! like `express.json()` + zod running before your route function.

use std::sync::Arc;

use axum::Json;
use axum::extract::{FromRequest, FromRequestParts, Query, Request};
use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;
use falcon_core::Role;
use sea_orm::prelude::Uuid;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Deserializer};
use validator::{Validate, ValidationErrors};

use crate::error::{AppError, FieldError};
use crate::state::AppState;

/// `Json<T>` + `validator` in one step: 400 with field errors on bad input.
pub struct ValidatedJson<T>(pub T);

impl<S, T> FromRequest<S> for ValidatedJson<T>
where
    S: Send + Sync,
    T: DeserializeOwned + Validate,
{
    type Rejection = AppError;

    async fn from_request(req: Request, state: &S) -> Result<Self, AppError> {
        let Json(value) = Json::<T>::from_request(req, state)
            .await
            .map_err(|_| AppError::Validation("malformed request body".into()))?;
        value.validate().map_err(field_errors)?;
        Ok(Self(value))
    }
}

/// `Query<T>` + `validator` in one step: 400 with the standard error
/// envelope on a bad query string. (Axum's own `Query` rejection is plain
/// text, not our envelope.)
pub struct ValidatedQuery<T>(pub T);

impl<S, T> FromRequestParts<S> for ValidatedQuery<T>
where
    S: Send + Sync,
    T: DeserializeOwned + Validate,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, AppError> {
        let Query(value) = Query::<T>::from_request_parts(parts, state)
            .await
            .map_err(|_| AppError::Validation("malformed query string".into()))?;
        value.validate().map_err(field_errors)?;
        Ok(Self(value))
    }
}

/// `?page=&perPage=` on list endpoints. Page 1 and 20 per page by default;
/// at most 100 per page.
#[derive(Debug, Clone, Copy, Default, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct PageQuery {
    /// The page to return, from 1.
    #[validate(range(min = 1, message = "page must be 1 or more"))]
    pub page: Option<u64>,
    /// Items per page, 1 to 100.
    #[validate(range(min = 1, max = 100, message = "perPage must be between 1 and 100"))]
    pub per_page: Option<u64>,
}

impl PageQuery {
    /// Items per page when `perPage` is not sent.
    pub const DEFAULT_PER_PAGE: u64 = 20;

    /// The page, 1 when not sent.
    #[must_use]
    pub fn page(&self) -> u64 {
        self.page.unwrap_or(1)
    }

    /// Items per page, [`Self::DEFAULT_PER_PAGE`] when not sent.
    #[must_use]
    pub fn per_page(&self) -> u64 {
        self.per_page.unwrap_or(Self::DEFAULT_PER_PAGE)
    }

    /// Rows to skip. Capped at Postgres's largest `OFFSET` (a signed 64-bit
    /// number), so an absurd `page` returns an empty page instead of a 500.
    /// `saturating_*` stops at the type's limit where `*` would overflow (which
    /// panics in debug builds; JavaScript would silently lose precision).
    #[must_use]
    pub fn offset(&self) -> u64 {
        (self.page() - 1)
            .saturating_mul(self.per_page())
            .min(i64::MAX.unsigned_abs())
    }
}

/// Parses a UUID path parameter (`/farms/{farmId}`). A malformed id gets the
/// same 404 as an id that does not exist, so clients see one answer for
/// "no such thing" (template §9: owner-only, ids cannot be probed).
///
/// # Errors
/// [`AppError::NotFound`] naming `what` when `raw` is not a UUID.
pub fn parse_id(raw: &str, what: &'static str) -> Result<Uuid, AppError> {
    Uuid::parse_str(raw).map_err(|_| AppError::NotFound(what))
}

/// For PATCH bodies: tells a missing field (`None`) apart from one sent as
/// `null` (`Some(None)`), so `{"notes": null}` can clear a value while `{}`
/// leaves it alone. Use with `#[serde(default, deserialize_with = "nullable")]`:
/// serde only calls this when the key is present, and `default` covers absence.
///
/// # Errors
/// The deserializer's error when the value has the wrong type.
pub fn nullable<'de, D, T>(deserializer: D) -> Result<Option<Option<T>>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    Option::<T>::deserialize(deserializer).map(Some)
}

// Flattens validator's nested report into the client-facing list.
// Takes ownership because `map_err` hands the error over by value.
fn field_errors(errors: ValidationErrors) -> AppError {
    let fields = errors
        .field_errors()
        .into_iter()
        .flat_map(|(field, errs)| {
            errs.iter().map(move |e| FieldError {
                field: field.to_string(),
                message: e
                    .message
                    .as_ref()
                    .map_or_else(|| e.code.to_string(), ToString::to_string),
            })
        })
        .collect();
    AppError::ValidationFields(fields)
}

/// The signed-in user. Put it in a handler's arguments to require sign-in:
/// without a valid Clerk session token the handler never runs and the client
/// gets 401 with the generic error envelope (template §9.2: never say why).
///
/// The token is read from `Authorization: Bearer <token>` only. Clerk's web
/// SDK sends it that way, and the future mobile apps will too.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuthUser {
    /// Clerk user id (the token's `sub`), e.g. `user_2abc…`.
    pub user_id: String,
    /// Role from Clerk `public_metadata.role`; member unless exactly `admin`.
    pub role: Role,
}

impl FromRequestParts<Arc<AppState>> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, AppError> {
        let token = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|value| bearer_token(value.to_str().ok()))
            .ok_or(AppError::Unauthorized)?;
        // 401 for a bad token, 503 if Clerk's keys cannot be fetched.
        let session = state.clerk.verify(token).await?;
        Ok(Self {
            user_id: session.user_id,
            role: session.role,
        })
    }
}

/// A signed-in admin. Like [`AuthUser`], plus 403 for anyone who is not an
/// admin — the template §10 `require_role(Role::Admin)`, as an extractor.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminUser(pub AuthUser);

impl FromRequestParts<Arc<AppState>> for AdminUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, AppError> {
        let user = AuthUser::from_request_parts(parts, state).await?;
        if user.role.is_admin() {
            Ok(Self(user))
        } else {
            Err(AppError::Forbidden)
        }
    }
}

// `Bearer <token>`; the scheme name is case-insensitive (RFC 9110 §11.1).
fn bearer_token(header: Option<&str>) -> Option<&str> {
    let (scheme, token) = header?.split_once(' ')?;
    let token = token.trim();
    (scheme.eq_ignore_ascii_case("bearer") && !token.is_empty()).then_some(token)
}

#[cfg(test)]
mod tests {
    use super::{PageQuery, bearer_token, parse_id};

    #[test]
    fn bearer_token_is_parsed_strictly() {
        assert_eq!(bearer_token(Some("Bearer abc.def")), Some("abc.def"));
        assert_eq!(bearer_token(Some("bearer abc")), Some("abc"));
        assert_eq!(bearer_token(Some("Basic abc")), None);
        assert_eq!(bearer_token(Some("Bearer ")), None);
        assert_eq!(bearer_token(Some("Bearer")), None);
        assert_eq!(bearer_token(None), None);
    }

    #[test]
    fn page_query_defaults_and_offset() {
        let q = PageQuery::default();
        assert_eq!((q.page(), q.per_page(), q.offset()), (1, 20, 0));
        let q = PageQuery {
            page: Some(3),
            per_page: Some(10),
        };
        assert_eq!(q.offset(), 20);
        let q = PageQuery {
            page: Some(u64::MAX),
            per_page: Some(100),
        };
        assert_eq!(q.offset(), i64::MAX.unsigned_abs());
    }

    #[test]
    fn parse_id_accepts_only_uuids() {
        assert!(parse_id("3f0c2a8e-5a8e-4a49-9b8e-2f7b6b1d9c11", "farm").is_ok());
        assert!(parse_id("not-a-uuid", "farm").is_err());
        assert!(parse_id("", "farm").is_err());
    }
}
