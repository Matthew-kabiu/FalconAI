//! Transport middleware: security headers, CORS, error context, panic handler.
//!
//! tower "layers" are Express `app.use(...)` with types: each wraps the next
//! service in the onion.

use std::any::Any;

use axum::Json;
use axum::extract::Request;
use axum::http::header::{
    AUTHORIZATION, CONTENT_TYPE, REFERRER_POLICY, STRICT_TRANSPORT_SECURITY,
    X_CONTENT_TYPE_OPTIONS, X_FRAME_OPTIONS,
};
use axum::http::{HeaderName, HeaderValue, Method, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use tower::ServiceBuilder;
use tower::layer::util::{Identity, Stack};
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::set_header::SetResponseHeaderLayer;

use crate::config::Config;
use crate::http::respond::{self, ErrorEnvelope};

type HeaderLayer = SetResponseHeaderLayer<HeaderValue>;

/// The concrete type of [`security`]. Rust needs a named type to return a
/// stack of layers; each `.layer()` call nests one more `Stack`.
pub type SecurityHeaders = Stack<
    HeaderLayer,
    Stack<HeaderLayer, Stack<HeaderLayer, Stack<HeaderLayer, Stack<HeaderLayer, Identity>>>>,
>;

/// Security headers on every response (template §10.1).
#[must_use]
pub fn security() -> ServiceBuilder<SecurityHeaders> {
    ServiceBuilder::new()
        .layer(SetResponseHeaderLayer::overriding(
            X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            X_FRAME_OPTIONS,
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            REFERRER_POLICY,
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            STRICT_TRANSPORT_SECURITY,
            HeaderValue::from_static("max-age=31536000; includeSubDomains"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("permissions-policy"),
            HeaderValue::from_static("camera=(), microphone=(), geolocation=()"),
        ))
}

/// CORS from `CORS_ORIGINS`: an explicit allowlist, never a wildcard (template §3.2, §9.1 A05).
///
/// Sign-in is a Clerk session token in the `Authorization` header (allowed
/// below). Credentials stay allowed because the web app's API client uses
/// `credentials: 'include'` (SOP addendum). With credentials on, browsers
/// forbid wildcard headers, so methods and headers are listed explicitly.
/// The same origins double as the allowed `azp` values of Clerk tokens.
pub fn cors(config: &Config) -> CorsLayer {
    // Origins were checked in Config::validate, so every parse succeeds here;
    // filter_map keeps this path free of unwrap().
    let origins: Vec<HeaderValue> = config
        .cors_origins
        .iter()
        .filter_map(|o| HeaderValue::from_str(o).ok())
        .collect();
    CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
        ])
        .allow_headers([CONTENT_TYPE, AUTHORIZATION])
        .allow_credentials(true)
}

/// Fills `path` and `requestId` into error envelopes built further in.
///
/// Error builders only see the error, not the request. They attach the
/// envelope to the response as an extension; this middleware sees both.
pub async fn error_context(req: Request, next: Next) -> Response {
    let path = req.uri().path().to_string();
    let request_id = req
        .headers()
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .map(str::to_string);

    let mut response = next.run(req).await;
    match response.extensions_mut().remove::<ErrorEnvelope>() {
        Some(envelope) => {
            let status = response.status();
            (status, Json(envelope.with_request(path, request_id))).into_response()
        }
        None => response,
    }
}

/// Turns a panic into the standard 500 envelope (used by `CatchPanicLayer`).
/// A backstop, not a strategy: the payload is not logged or returned, because
/// it may contain internal details.
/// It takes the payload by value because that is the signature
/// `CatchPanicLayer::custom` requires.
pub fn panic_response(_payload: Box<dyn Any + Send + 'static>) -> Response {
    tracing::error!("handler panicked");
    respond::error(
        StatusCode::INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        "An unexpected error occurred".to_string(),
    )
}
