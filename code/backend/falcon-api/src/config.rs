//! Configuration (template §13). The process refuses to start on invalid config.
//!
//! Like reading `process.env` once into a zod-validated object at boot, except
//! `envy` maps env vars onto struct fields by name (`APP_ENV` → `app_env`) and
//! `validator` checks them. No other code reads env vars.

use std::fmt;

use anyhow::Context;
use axum::http::HeaderValue;
use secrecy::SecretString;
use serde::Deserialize;
use validator::{Validate, ValidationError};

/// Validated service configuration, loaded from the environment.
///
/// | Env var              | Field                | Required |
/// |----------------------|----------------------|----------|
/// | `APP_ENV`            | `app_env`            | yes      |
/// | `PORT`               | `port`               | yes      |
/// | `DATABASE_URL`       | `database_url`       | yes      |
/// | `CLERK_ISSUER`       | `clerk_issuer`       | yes (`https://…`, no trailing `/`) |
/// | `CORS_ORIGINS`       | `cors_origins`       | yes (comma-separated) |
/// | `LOG_LEVEL`          | `log_level`          | no (`info`) |
/// | `SHUTDOWN_WAIT_SECS` | `shutdown_wait_secs` | no (`10`) |
/// | `DB_MAX_CONNS`       | `db_max_conns`       | no (`10`) |
///
/// Deviation from template §13 (Matt's decision, 2026-11-18): there is no
/// `JWT_SECRET`. Sign-in is handled by Clerk, which signs session tokens with
/// its own RSA keys; this API only verifies them against Clerk's public keys
/// (JWKS), so it holds no signing secret. `CLERK_SECRET_KEY` is deliberately
/// not read: nothing calls Clerk's Backend API yet.
#[derive(Deserialize, Validate)]
pub struct Config {
    /// `development` | `staging` | `production`.
    #[validate(custom(function = "one_of_env"))]
    pub app_env: String,
    /// Port the HTTP listener binds on `0.0.0.0`.
    #[validate(range(min = 1, max = 65535))]
    pub port: u16,
    /// Postgres URL. Secret: it contains the password.
    pub database_url: SecretString,
    /// Clerk Frontend API URL, e.g. `https://xxxx.clerk.accounts.dev`. Session
    /// tokens must carry exactly this `iss`, and the signing keys are fetched
    /// from `{clerk_issuer}/.well-known/jwks.json`. Not a secret.
    #[validate(custom(function = "valid_issuer"))]
    pub clerk_issuer: String,
    /// Browser origins allowed by CORS, comma-separated in env; envy splits it.
    /// Also the list of authorised parties: a Clerk token's `azp` claim (the
    /// origin that requested it), when present, must be one of these.
    #[validate(length(min = 1), custom(function = "valid_origins"))]
    pub cors_origins: Vec<String>,
    /// `tracing` filter, e.g. `info` or `falcon_api=debug,tower_http=info`.
    #[serde(default = "default_log_level")]
    pub log_level: String,
    /// Seconds workers get to finish their cycle on shutdown (template §15, §16).
    #[serde(default = "default_shutdown_secs")]
    pub shutdown_wait_secs: u64,
    /// Maximum database pool size.
    #[serde(default = "default_db_max_conns")]
    pub db_max_conns: u32,
}

impl Config {
    /// Reads and validates configuration from the environment.
    ///
    /// # Errors
    /// Returns an error naming the problem if a variable is missing, unparsable
    /// or fails validation. `main` lets that error stop the process.
    pub fn load() -> anyhow::Result<Self> {
        // Dev convenience; a no-op when there is no .env file (compose/Coolify
        // inject env directly). `.ok()` deliberately discards "file not found".
        dotenvy::dotenv().ok();
        let cfg: Config = envy::from_env().context("parse env")?;
        cfg.validate().context("invalid configuration")?;
        Ok(cfg)
    }

    /// True when running in production.
    #[must_use]
    pub fn is_production(&self) -> bool {
        self.app_env == "production"
    }
}

// Manual Debug so secrets can never reach a log line via `{:?}` (template §13).
impl fmt::Debug for Config {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Config")
            .field("app_env", &self.app_env)
            .field("port", &self.port)
            .field("database_url", &"[REDACTED]")
            .field("clerk_issuer", &self.clerk_issuer)
            .field("cors_origins", &self.cors_origins)
            .field("log_level", &self.log_level)
            .field("shutdown_wait_secs", &self.shutdown_wait_secs)
            .field("db_max_conns", &self.db_max_conns)
            .finish()
    }
}

fn default_log_level() -> String {
    "info".to_string()
}

fn default_shutdown_secs() -> u64 {
    10
}

// A small service on one Postgres; raise when load shows pool waits.
fn default_db_max_conns() -> u32 {
    10
}

// validator passes `&String`; taking `&str` works through deref coercion and
// is what clippy prefers.
fn one_of_env(value: &str) -> Result<(), ValidationError> {
    match value {
        "development" | "staging" | "production" => Ok(()),
        _ => Err(ValidationError::new("app_env")
            .with_message("APP_ENV must be development, staging or production".into())),
    }
}

// The issuer must be HTTPS (the keys fetched from it decide who is signed in)
// and must not end in `/`: the token's `iss` is compared exactly, and Clerk's
// has no trailing slash, so a stray `/` would reject every token.
fn valid_issuer(value: &str) -> Result<(), ValidationError> {
    let host = value.strip_prefix("https://").unwrap_or_default();
    if !host.is_empty() && !value.ends_with('/') && !value.contains(char::is_whitespace) {
        Ok(())
    } else {
        Err(ValidationError::new("clerk_issuer")
            .with_message("CLERK_ISSUER must be an https:// URL with no trailing slash".into()))
    }
}

// Each origin must be an explicit http(s) origin that is also a valid header
// value, so the CORS layer can be built later without any fallible step.
// A wildcard is refused (template §24: never `CorsLayer::permissive()`).
fn valid_origins(origins: &[String]) -> Result<(), ValidationError> {
    let ok = origins.iter().all(|o| {
        (o.starts_with("https://") || o.starts_with("http://")) && HeaderValue::from_str(o).is_ok()
    });
    if ok {
        Ok(())
    } else {
        Err(ValidationError::new("cors_origins").with_message(
            "CORS_ORIGINS must be comma-separated http(s) origins, no wildcard".into(),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::valid_issuer;

    #[test]
    fn issuer_must_be_https_without_trailing_slash() {
        assert!(valid_issuer("https://example.clerk.accounts.dev").is_ok());
        assert!(valid_issuer("https://clerk.example.com").is_ok());
        for bad in [
            "",
            "https://",
            "http://example.clerk.accounts.dev",
            "https://example.clerk.accounts.dev/",
            "example.clerk.accounts.dev",
            "https://exa mple.dev",
        ] {
            assert!(valid_issuer(bad).is_err(), "{bad:?}");
        }
    }
}
