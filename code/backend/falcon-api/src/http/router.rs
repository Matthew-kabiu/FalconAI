//! The route table — the full surface, readable at once (template §10).

use std::sync::Arc;
use std::time::Duration;

use axum::Router;
use axum::extract::DefaultBodyLimit;
use axum::http::StatusCode;
use axum::routing::{get, patch, post};
use tower::ServiceBuilder;
use tower_http::catch_panic::CatchPanicLayer;
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;

use crate::http::middleware;
use crate::state::AppState;
use crate::{account, activity, admin, calendar, crop, crop_cycle, event, farm, health, plot};

/// Global request deadline (template §10). Stream routes (§17) will be mounted
/// outside this layer when they arrive.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// Global body limit: 1 MiB (template §9.2, SOP addendum §10). Only the
/// crop-image upload route will get a larger, explicit limit.
const BODY_LIMIT_BYTES: usize = 1 << 20;

/// Builds the application router with every middleware layer.
///
/// Authentication is per handler: an `AuthUser` argument requires a valid
/// Clerk session token (401 otherwise), an `AdminUser` argument additionally
/// requires the admin role (403 otherwise). Sign-up, sign-in and sign-out are
/// Clerk's job, so this API has no routes for them.
pub fn router(state: Arc<AppState>) -> Router {
    let v1 = Router::new()
        .route("/me", get(account::handler::me))
        .route("/admin/ping", get(admin::handler::ping))
        .route("/farms", get(farm::handler::list).post(farm::handler::create))
        .route(
            "/farms/{farm_id}",
            get(farm::handler::get)
                .patch(farm::handler::update)
                .delete(farm::handler::delete),
        )
        .route("/farms/{farm_id}/plots", post(plot::handler::create))
        .route(
            "/plots/{plot_id}",
            patch(plot::handler::update).delete(plot::handler::delete),
        )
        .route("/crops", get(crop::handler::list))
        .route("/crop-cycles", get(crop_cycle::handler::list))
        .route(
            "/plots/{plot_id}/crop-cycles",
            get(crop_cycle::handler::list_for_plot).post(crop_cycle::handler::create),
        )
        .route(
            "/crop-cycles/{cycle_id}",
            get(crop_cycle::handler::get).patch(crop_cycle::handler::update),
        )
        .route(
            "/crop-cycles/{cycle_id}/activities",
            get(activity::handler::list).post(activity::handler::create),
        )
        .route(
            "/activities/{activity_id}",
            patch(activity::handler::update).delete(activity::handler::delete),
        )
        .route("/calendar", get(calendar::handler::get))
        .route("/events", post(event::handler::create))
        .route(
            "/events/{event_id}",
            get(event::handler::get)
                .patch(event::handler::update)
                .delete(event::handler::delete),
        );

    Router::new()
        .route("/api/health", get(health::handler::check)) // unversioned, no auth
        .nest("/api/v1", v1)
        .layer(
            ServiceBuilder::new() // order matters: first listed = outermost
                .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid))
                .layer(PropagateRequestIdLayer::x_request_id())
                .layer(TraceLayer::new_for_http())
                .layer(axum::middleware::from_fn(middleware::error_context))
                .layer(CatchPanicLayer::custom(middleware::panic_response))
                .layer(TimeoutLayer::with_status_code(
                    StatusCode::REQUEST_TIMEOUT,
                    REQUEST_TIMEOUT,
                ))
                .layer(middleware::security())
                .layer(middleware::cors(&state.config))
                .layer(DefaultBodyLimit::max(BODY_LIMIT_BYTES)),
        )
        .with_state(state)
}

#[cfg(test)]
mod tests {
    //! Handler tests with `tower::ServiceExt::oneshot` (template §19): the
    //! real router and middleware, no network, no database.

    use std::sync::Arc;

    use axum::body::{Body, to_bytes};
    use axum::http::{Request, StatusCode, header};
    use sea_orm::DatabaseConnection;
    use secrecy::SecretString;
    use serde_json::{Value, json};
    use tower::ServiceExt;

    use super::router;
    use crate::config::Config;
    use crate::platform::clerk::testing;
    use crate::state::{AppState, services};

    fn app() -> axum::Router {
        let config = Config {
            app_env: "development".into(),
            port: 8080,
            database_url: SecretString::from("postgres://unused"),
            clerk_issuer: testing::ISSUER.into(),
            cors_origins: vec![testing::ORIGIN.into()],
            log_level: "info".into(),
            shutdown_wait_secs: 1,
            db_max_conns: 1,
        };
        // Disconnected: these tests only reach code that runs before any query.
        let db = DatabaseConnection::default();
        let services = services(&db);
        let state = AppState {
            config,
            db,
            http: reqwest::Client::new(),
            clerk: testing::verifier(),
            farms: services.farms,
            plots: services.plots,
            crop_cycles: services.crop_cycles,
            activities: services.activities,
            events: services.events,
            calendar: services.calendar,
        };
        router(Arc::new(state))
    }

    async fn get(path: &str, token: Option<&str>) -> (StatusCode, Value) {
        let mut request = Request::get(path);
        if let Some(token) = token {
            request = request.header(header::AUTHORIZATION, format!("Bearer {token}"));
        }
        let response = app()
            .oneshot(request.body(Body::empty()).unwrap())
            .await
            .unwrap();
        let status = response.status();
        let body = to_bytes(response.into_body(), 1 << 16).await.unwrap();
        (status, serde_json::from_slice(&body).unwrap())
    }

    /// Any method, optional bearer token, optional JSON body.
    async fn send(
        method: &str,
        path: &str,
        token: Option<&str>,
        json: Option<&str>,
    ) -> (StatusCode, Value) {
        let mut request = Request::builder().method(method).uri(path);
        if let Some(token) = token {
            request = request.header(header::AUTHORIZATION, format!("Bearer {token}"));
        }
        let body = match json {
            Some(json) => {
                request = request.header(header::CONTENT_TYPE, "application/json");
                Body::from(json.to_string())
            }
            None => Body::empty(),
        };
        let response = app().oneshot(request.body(body).unwrap()).await.unwrap();
        let status = response.status();
        let bytes = to_bytes(response.into_body(), 1 << 16).await.unwrap();
        (status, serde_json::from_slice(&bytes).unwrap())
    }

    fn assert_error(body: &Value, code: &str, status: u16) {
        assert_eq!(body["success"], false);
        assert_eq!(body["error"], code);
        assert_eq!(body["statusCode"], status);
        assert!(body["timestamp"].is_string());
    }

    #[tokio::test]
    async fn me_without_token_is_401() {
        let (status, body) = get("/api/v1/me", None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert_error(&body, "UNAUTHORIZED", 401);
        assert_eq!(body["message"], "unauthorized");
        assert_eq!(body["path"], "/api/v1/me");
    }

    #[tokio::test]
    async fn me_with_invalid_token_is_401_with_the_same_message() {
        let (status, body) = get("/api/v1/me", Some("not.a.jwt")).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert_error(&body, "UNAUTHORIZED", 401);
        assert_eq!(body["message"], "unauthorized");
    }

    #[tokio::test]
    async fn me_returns_user_id_and_role() {
        let (status, body) = get("/api/v1/me", Some(&testing::member_token())).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["success"], true);
        assert_eq!(body["data"]["userId"], "user_test123");
        assert_eq!(body["data"]["role"], "member");

        let (_, body) = get("/api/v1/me", Some(&testing::admin_token())).await;
        assert_eq!(body["data"]["role"], "admin");
    }

    #[tokio::test]
    async fn admin_ping_enforces_the_role() {
        let (status, body) = get("/api/v1/admin/ping", None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
        assert_error(&body, "UNAUTHORIZED", 401);

        let (status, body) = get("/api/v1/admin/ping", Some(&testing::member_token())).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
        assert_error(&body, "FORBIDDEN", 403);

        let (status, body) = get("/api/v1/admin/ping", Some(&testing::admin_token())).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["data"]["ok"], true);
    }

    // ---- Farms and plots -------------------------------------------------
    // The database is disconnected here, so these tests cover everything that
    // happens before a query: sign-in, body and query parsing, path ids and
    // the falcon-core rules (the services check input before touching the
    // database). Owner-only behaviour needs a real database; see
    // tests/farm_owner.rs.

    const ID: &str = "3f0c2a8e-5a8e-4a49-9b8e-2f7b6b1d9c11";

    #[tokio::test]
    async fn farm_and_plot_routes_require_sign_in() {
        let farm = format!("/api/v1/farms/{ID}");
        let farm_plots = format!("/api/v1/farms/{ID}/plots");
        let plot = format!("/api/v1/plots/{ID}");
        let routes = [
            ("GET", "/api/v1/farms", None),
            ("POST", "/api/v1/farms", Some(r#"{"name":"F","county":"embu"}"#)),
            ("GET", farm.as_str(), None),
            ("PATCH", farm.as_str(), Some("{}")),
            ("DELETE", farm.as_str(), None),
            (
                "POST",
                farm_plots.as_str(),
                Some(r#"{"name":"P","size":1,"sizeUnit":"acres"}"#),
            ),
            ("PATCH", plot.as_str(), Some("{}")),
            ("DELETE", plot.as_str(), None),
        ];
        for (method, path, body) in routes {
            for token in [None, Some("not.a.jwt")] {
                let (status, json) = send(method, path, token, body).await;
                assert_eq!(status, StatusCode::UNAUTHORIZED, "{method} {path} {token:?}");
                assert_error(&json, "UNAUTHORIZED", 401);
                assert_eq!(json["message"], "unauthorized");
                assert_eq!(json["path"], path);
            }
        }
    }

    #[tokio::test]
    async fn create_farm_lists_every_broken_rule_as_422() {
        let token = testing::member_token();
        let long = "x".repeat(81);
        let body = json!({ "name": "  ", "county": "Kiambu", "locality": long }).to_string();
        let (status, json) = send("POST", "/api/v1/farms", Some(&token), Some(&body)).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_error(&json, "VALIDATION_ERROR", 422);
        assert_eq!(
            json["errors"],
            json!([
                { "field": "name", "code": "required" },
                { "field": "county", "code": "invalid_choice" },
                { "field": "locality", "code": "too_long" },
            ])
        );
        assert_eq!(
            json["message"],
            "name: required; county: invalid_choice; locality: too_long"
        );
        assert_eq!(json["path"], "/api/v1/farms");
    }

    #[tokio::test]
    async fn malformed_or_incomplete_bodies_are_400_without_errors_list() {
        let token = testing::member_token();
        for body in [
            "not json",
            r#"{"county":"embu"}"#,            // name missing
            r#"{"name":"F"}"#,                 // county missing
            r#"{"name":5,"county":"embu"}"#,   // wrong type
            r#"{"name":"F","county":null}"#,   // null for a required field
        ] {
            let (status, json) = send("POST", "/api/v1/farms", Some(&token), Some(body)).await;
            assert_eq!(status, StatusCode::BAD_REQUEST, "body {body}");
            assert_error(&json, "VALIDATION_ERROR", 400);
            assert!(json.get("errors").is_none(), "body {body}");
        }
        let path = format!("/api/v1/farms/{ID}/plots");
        for body in [
            r#"{"name":"P","sizeUnit":"acres"}"#,          // size missing
            r#"{"name":"P","size":"1","sizeUnit":"acres"}"#, // size as text
        ] {
            let (status, json) = send("POST", &path, Some(&token), Some(body)).await;
            assert_eq!(status, StatusCode::BAD_REQUEST, "body {body}");
            assert_error(&json, "VALIDATION_ERROR", 400);
        }
    }

    #[tokio::test]
    async fn create_plot_lists_every_broken_rule_as_422() {
        let token = testing::member_token();
        let notes = "n".repeat(501);
        let body =
            json!({ "name": "", "size": 1000.01, "sizeUnit": "ha", "notes": notes }).to_string();
        let path = format!("/api/v1/farms/{ID}/plots");
        let (status, json) = send("POST", &path, Some(&token), Some(&body)).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_error(&json, "VALIDATION_ERROR", 422);
        assert_eq!(
            json["errors"],
            json!([
                { "field": "name", "code": "required" },
                { "field": "size", "code": "out_of_range" },
                { "field": "sizeUnit", "code": "invalid_choice" },
                { "field": "notes", "code": "too_long" },
            ])
        );

        let body = json!({ "name": "P", "size": 0, "sizeUnit": "acres" }).to_string();
        let (status, json) = send("POST", &path, Some(&token), Some(&body)).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(json["errors"], json!([{ "field": "size", "code": "out_of_range" }]));
    }

    #[tokio::test]
    async fn patches_apply_the_same_rules() {
        let token = testing::member_token();
        let farm = format!("/api/v1/farms/{ID}");
        let body = json!({ "name": "", "county": "nowhere" }).to_string();
        let (status, json) = send("PATCH", &farm, Some(&token), Some(&body)).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(
            json["errors"],
            json!([
                { "field": "name", "code": "required" },
                { "field": "county", "code": "invalid_choice" },
            ])
        );

        let plot = format!("/api/v1/plots/{ID}");
        let body = json!({ "size": -1, "sizeUnit": "Acres" }).to_string();
        let (status, json) = send("PATCH", &plot, Some(&token), Some(&body)).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(
            json["errors"],
            json!([
                { "field": "size", "code": "out_of_range" },
                { "field": "sizeUnit", "code": "invalid_choice" },
            ])
        );
    }

    #[tokio::test]
    async fn a_malformed_id_is_404_like_a_missing_one() {
        let token = testing::member_token();
        for (method, path, body) in [
            ("GET", "/api/v1/farms/not-a-uuid", None),
            ("PATCH", "/api/v1/farms/not-a-uuid", Some("{}")),
            ("DELETE", "/api/v1/farms/123", None),
            (
                "POST",
                "/api/v1/farms/not-a-uuid/plots",
                Some(r#"{"name":"P","size":1,"sizeUnit":"acres"}"#),
            ),
            ("PATCH", "/api/v1/plots/not-a-uuid", Some("{}")),
            ("DELETE", "/api/v1/plots/not-a-uuid", None),
        ] {
            let (status, json) = send(method, path, Some(&token), body).await;
            assert_eq!(status, StatusCode::NOT_FOUND, "{method} {path}");
            assert_error(&json, "NOT_FOUND", 404);
        }
    }

    // ---- Crops, crop cycles and activities --------------------------------
    // Same limits as above: no database, so these cover sign-in, parsing, ids
    // and the falcon-core rules that run before a query. Crop-cycle rules run
    // before any query; activity rules need the cycle's planting date, so
    // their 422s are covered in falcon-core's unit tests and in
    // tests/crop_owner.rs. Dates far in the past or future are used so the
    // tests do not depend on today's date.

    #[tokio::test]
    async fn crop_routes_require_sign_in() {
        let plot_cycles = format!("/api/v1/plots/{ID}/crop-cycles");
        let cycle = format!("/api/v1/crop-cycles/{ID}");
        let cycle_activities = format!("/api/v1/crop-cycles/{ID}/activities");
        let activity = format!("/api/v1/activities/{ID}");
        let routes = [
            ("GET", "/api/v1/crops", None),
            ("GET", "/api/v1/crop-cycles", None),
            ("GET", plot_cycles.as_str(), None),
            (
                "POST",
                plot_cycles.as_str(),
                Some(r#"{"crop":"maize","plantedOn":"2026-11-01"}"#),
            ),
            ("GET", cycle.as_str(), None),
            ("PATCH", cycle.as_str(), Some("{}")),
            ("GET", cycle_activities.as_str(), None),
            (
                "POST",
                cycle_activities.as_str(),
                Some(r#"{"kind":"weeding","doneOn":"2026-11-01"}"#),
            ),
            ("PATCH", activity.as_str(), Some("{}")),
            ("DELETE", activity.as_str(), None),
        ];
        for (method, path, body) in routes {
            for token in [None, Some("not.a.jwt")] {
                let (status, json) = send(method, path, token, body).await;
                assert_eq!(status, StatusCode::UNAUTHORIZED, "{method} {path} {token:?}");
                assert_error(&json, "UNAUTHORIZED", 401);
                assert_eq!(json["message"], "unauthorized");
            }
        }
    }

    #[tokio::test]
    async fn crops_lists_the_catalogue() {
        let (status, json) = get("/api/v1/crops", Some(&testing::member_token())).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(json["success"], true);
        let crops = json["data"].as_array().unwrap();
        let slugs: Vec<&str> = crops.iter().map(|c| c["crop"].as_str().unwrap()).collect();
        assert_eq!(
            slugs,
            [
                "maize",
                "sorghum",
                "finger_millet",
                "pearl_millet",
                "rice",
                "beans",
                "green_grams",
                "cowpeas",
                "pigeon_peas",
                "cassava",
                "irish_potatoes",
                "sweet_potatoes",
                "bananas",
                "other"
            ]
        );
        assert_eq!(
            crops[0],
            json!({ "crop": "maize", "hasCalendar": true, "healthCheck": true })
        );
        assert_eq!(crops[5]["crop"], "beans");
        assert_eq!(crops[5]["healthCheck"], true);
        assert_eq!(crops[1]["healthCheck"], false);
        // Every catalogue crop has a sourced calendar; `other` never does.
        assert!(
            crops
                .iter()
                .all(|c| c["hasCalendar"] == (c["crop"] != "other"))
        );
    }

    #[tokio::test]
    async fn start_crop_cycle_lists_every_broken_rule_as_422() {
        let token = testing::member_token();
        let path = format!("/api/v1/plots/{ID}/crop-cycles");
        let variety = "v".repeat(81);

        let body = json!({ "crop": "corn", "variety": variety, "plantedOn": "2000-01-01" });
        let (status, json) = send("POST", &path, Some(&token), Some(&body.to_string())).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_error(&json, "VALIDATION_ERROR", 422);
        assert_eq!(
            json["errors"],
            json!([
                { "field": "crop", "code": "invalid_choice" },
                { "field": "variety", "code": "too_long" },
                { "field": "plantedOn", "code": "out_of_range" },
            ])
        );

        // `other` needs customCrop; a catalogue crop must not have one.
        let body = json!({ "crop": "other", "plantedOn": "2999-01-01" });
        let (status, json) = send("POST", &path, Some(&token), Some(&body.to_string())).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(
            json["errors"],
            json!([
                { "field": "customCrop", "code": "required" },
                { "field": "plantedOn", "code": "out_of_range" },
            ])
        );
        let body = json!({ "crop": "maize", "customCrop": "Corn", "plantedOn": "2000-01-01" });
        let (_, json) = send("POST", &path, Some(&token), Some(&body.to_string())).await;
        assert_eq!(
            json["errors"],
            json!([
                { "field": "customCrop", "code": "not_allowed" },
                { "field": "plantedOn", "code": "out_of_range" },
            ])
        );
    }

    #[tokio::test]
    async fn update_crop_cycle_checks_fields_before_the_database() {
        let token = testing::member_token();
        let path = format!("/api/v1/crop-cycles/{ID}");
        let body = json!({ "variety": "v".repeat(81), "plantedOn": "2999-01-01", "status": "done" });
        let (status, json) = send("PATCH", &path, Some(&token), Some(&body.to_string())).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(
            json["errors"],
            json!([
                { "field": "variety", "code": "too_long" },
                { "field": "plantedOn", "code": "out_of_range" },
                { "field": "status", "code": "invalid_choice" },
            ])
        );
    }

    #[tokio::test]
    async fn malformed_crop_and_activity_bodies_are_400() {
        let token = testing::member_token();
        let cycles = format!("/api/v1/plots/{ID}/crop-cycles");
        for body in [
            r#"{"plantedOn":"2026-11-01"}"#,                 // crop missing
            r#"{"crop":"maize"}"#,                           // plantedOn missing
            r#"{"crop":"maize","plantedOn":"19/11/2026"}"#,  // not YYYY-MM-DD
            r#"{"crop":"maize","plantedOn":"2026-02-30"}"#,  // not a real date
            r#"{"crop":"maize","plantedOn":null}"#,          // null for a required field
        ] {
            let (status, json) = send("POST", &cycles, Some(&token), Some(body)).await;
            assert_eq!(status, StatusCode::BAD_REQUEST, "body {body}");
            assert_error(&json, "VALIDATION_ERROR", 400);
            assert!(json.get("errors").is_none(), "body {body}");
        }
        let cycle = format!("/api/v1/crop-cycles/{ID}");
        let (status, _) = send("PATCH", &cycle, Some(&token), Some(r#"{"plantedOn":"soon"}"#)).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);

        let activities = format!("/api/v1/crop-cycles/{ID}/activities");
        for body in [
            r#"{"doneOn":"2026-11-01"}"#,                            // kind missing
            r#"{"kind":"weeding"}"#,                                 // doneOn missing
            r#"{"kind":"weeding","doneOn":"2026-11-01","costKes":12.5}"#, // not a whole number
            r#"{"kind":"weeding","doneOn":"2026-11-01","quantity":"5"}"#, // number as text
        ] {
            let (status, json) = send("POST", &activities, Some(&token), Some(body)).await;
            assert_eq!(status, StatusCode::BAD_REQUEST, "body {body}");
            assert_error(&json, "VALIDATION_ERROR", 400);
        }
        let activity = format!("/api/v1/activities/{ID}");
        let (status, _) = send("PATCH", &activity, Some(&token), Some(r#"{"costKes":"x"}"#)).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn crop_cycle_list_rejects_a_bad_filter_or_paging_with_400() {
        let token = testing::member_token();
        for query in ["status=all", "status=Open", "status=", "page=0", "perPage=101"] {
            let path = format!("/api/v1/crop-cycles?{query}");
            let (status, json) = send("GET", &path, Some(&token), None).await;
            assert_eq!(status, StatusCode::BAD_REQUEST, "query {query}");
            assert_error(&json, "VALIDATION_ERROR", 400);
        }
        let path = format!("/api/v1/crop-cycles/{ID}/activities?perPage=0");
        let (status, _) = send("GET", &path, Some(&token), None).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn a_malformed_cycle_or_activity_id_is_404() {
        let token = testing::member_token();
        for (method, path, body) in [
            ("GET", "/api/v1/plots/not-a-uuid/crop-cycles", None),
            (
                "POST",
                "/api/v1/plots/not-a-uuid/crop-cycles",
                Some(r#"{"crop":"maize","plantedOn":"2026-11-01"}"#),
            ),
            ("GET", "/api/v1/crop-cycles/not-a-uuid", None),
            ("PATCH", "/api/v1/crop-cycles/123", Some("{}")),
            ("GET", "/api/v1/crop-cycles/not-a-uuid/activities", None),
            (
                "POST",
                "/api/v1/crop-cycles/not-a-uuid/activities",
                Some(r#"{"kind":"weeding","doneOn":"2026-11-01"}"#),
            ),
            ("PATCH", "/api/v1/activities/not-a-uuid", Some("{}")),
            ("DELETE", "/api/v1/activities/not-a-uuid", None),
        ] {
            let (status, json) = send(method, path, Some(&token), body).await;
            assert_eq!(status, StatusCode::NOT_FOUND, "{method} {path}");
            assert_error(&json, "NOT_FOUND", 404);
        }
    }

    #[tokio::test]
    async fn calendar_requires_sign_in() {
        for path in ["/api/v1/calendar", "/api/v1/calendar?from=2026-11-01&to=2026-12-01"] {
            for token in [None, Some("not.a.jwt")] {
                let (status, json) = get(path, token).await;
                assert_eq!(status, StatusCode::UNAUTHORIZED, "{path} {token:?}");
                assert_error(&json, "UNAUTHORIZED", 401);
                assert_eq!(json["message"], "unauthorized");
            }
        }
        // A bad window without a token is still 401: sign-in is checked first.
        let (status, _) = get("/api/v1/calendar?from=nope", None).await;
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn calendar_rejects_a_bad_window_with_400_before_the_database() {
        let token = testing::member_token();
        for query in [
            "from=19/11/2026",                  // not YYYY-MM-DD
            "from=2026-02-30",                  // not a real date
            "to=soon",                          // not a date
            "from=",                            // empty
            "from=2026-11-20&to=2026-11-19",    // from after to
            "from=2026-01-01&to=2026-07-01",    // 181 days apart (180 is the most)
            "from=2020-01-01",                  // too long against the default `to`
        ] {
            let path = format!("/api/v1/calendar?{query}");
            let (status, json) = get(&path, Some(&token)).await;
            assert_eq!(status, StatusCode::BAD_REQUEST, "query {query}");
            assert_error(&json, "VALIDATION_ERROR", 400);
            assert!(json.get("errors").is_none(), "query {query}");
        }
    }

    // ---- Calendar events -----------------------------------------------
    // Event rules need no database, so the 422s are checked here; ownership
    // (404 for someone else's event or cycle) is in tests/event_owner.rs.

    #[tokio::test]
    async fn event_routes_require_sign_in() {
        let event = format!("/api/v1/events/{ID}");
        let routes = [
            (
                "POST",
                "/api/v1/events",
                Some(r#"{"title":"Agrovet","date":"2026-11-20"}"#),
            ),
            ("POST", "/api/v1/events", Some("not json")),
            ("GET", event.as_str(), None),
            ("PATCH", event.as_str(), Some(r#"{"title":"x"}"#)),
            ("DELETE", event.as_str(), None),
            ("GET", "/api/v1/events/not-a-uuid", None),
        ];
        for (method, path, body) in routes {
            for token in [None, Some("not.a.jwt")] {
                let (status, json) = send(method, path, token, body).await;
                assert_eq!(status, StatusCode::UNAUTHORIZED, "{method} {path} {token:?}");
                assert_error(&json, "UNAUTHORIZED", 401);
                assert_eq!(json["message"], "unauthorized");
            }
        }
    }

    #[tokio::test]
    async fn create_event_lists_every_broken_rule_as_422() {
        let token = testing::member_token();
        // 2000-01-01 is always in the past; 2999-01-01 always too far ahead.
        let body = json!({
            "title": "  ",
            "description": "d".repeat(1001),
            "date": "2000-01-01",
            "time": "25:00",
            "notes": "n".repeat(501),
        });
        let (status, json) =
            send("POST", "/api/v1/events", Some(&token), Some(&body.to_string())).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_error(&json, "VALIDATION_ERROR", 422);
        assert_eq!(
            json["errors"],
            json!([
                { "field": "title", "code": "required" },
                { "field": "description", "code": "too_long" },
                { "field": "date", "code": "out_of_range" },
                { "field": "time", "code": "invalid_choice" },
                { "field": "notes", "code": "too_long" },
            ])
        );
        let body = json!({ "title": "t".repeat(121), "date": "2999-01-01", "time": "9:30" });
        let (status, json) =
            send("POST", "/api/v1/events", Some(&token), Some(&body.to_string())).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(
            json["errors"],
            json!([
                { "field": "title", "code": "too_long" },
                { "field": "date", "code": "out_of_range" },
                { "field": "time", "code": "invalid_choice" },
            ])
        );
    }

    #[tokio::test]
    async fn update_event_checks_fields_before_the_database() {
        let token = testing::member_token();
        let path = format!("/api/v1/events/{ID}");
        let body = json!({
            "title": "",
            "description": "d".repeat(1001),
            "date": "2000-01-01",
            "time": "noon",
        });
        let (status, json) = send("PATCH", &path, Some(&token), Some(&body.to_string())).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(
            json["errors"],
            json!([
                { "field": "title", "code": "required" },
                { "field": "description", "code": "too_long" },
                { "field": "date", "code": "out_of_range" },
                { "field": "time", "code": "invalid_choice" },
            ])
        );
    }

    #[tokio::test]
    async fn malformed_event_bodies_are_400_and_malformed_ids_404() {
        let token = testing::member_token();
        for body in [
            r#"{"date":"2999-01-01"}"#,                        // no title
            r#"{"title":"x"}"#,                                // no date
            r#"{"title":"x","date":"01/12/2026"}"#,            // not YYYY-MM-DD
            r#"{"title":"x","date":"2026-12-01","time":930}"#, // time not a string
            r#"{"title":"x","date":"2026-12-01","cycleId":"nope"}"#, // not a UUID
            r#"{"title":"x","date":"2026-12-01","description":5}"#, // not a string
            "not json",
        ] {
            let (status, json) = send("POST", "/api/v1/events", Some(&token), Some(body)).await;
            assert_eq!(status, StatusCode::BAD_REQUEST, "{body}");
            assert_error(&json, "VALIDATION_ERROR", 400);
            assert!(json.get("errors").is_none(), "{body}");
        }
        let path = format!("/api/v1/events/{ID}");
        let (status, _) = send("PATCH", &path, Some(&token), Some(r#"{"cycleId":5}"#)).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        for (method, body) in [("GET", None), ("PATCH", Some("{}")), ("DELETE", None)] {
            let (status, json) =
                send(method, "/api/v1/events/not-a-uuid", Some(&token), body).await;
            assert_eq!(status, StatusCode::NOT_FOUND, "{method}");
            assert_error(&json, "NOT_FOUND", 404);
        }
    }

    #[tokio::test]
    async fn list_farms_rejects_bad_paging_with_400() {
        let token = testing::member_token();
        for query in ["page=0", "perPage=0", "perPage=101", "page=abc", "perPage=-1"] {
            let path = format!("/api/v1/farms?{query}");
            let (status, json) = send("GET", &path, Some(&token), None).await;
            assert_eq!(status, StatusCode::BAD_REQUEST, "query {query}");
            assert_error(&json, "VALIDATION_ERROR", 400);
        }
    }
}
