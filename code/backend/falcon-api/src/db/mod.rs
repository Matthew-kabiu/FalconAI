//! Database pool construction and health check (template §12.2).
//!
//! SeaORM entities live in `db/entities/`, generated (from `code/backend/`,
//! against a migrated database) with `sea-orm-cli generate entity -o
//! falcon-api/src/db/entities --with-serde none`. They mirror the migrated
//! schema and are never hand-edited: change a migration, then regenerate.

use std::time::Duration;

use anyhow::Context;
use sea_orm::{ConnectOptions, Database, DatabaseConnection, DbErr};
use secrecy::ExposeSecret;

use crate::config::Config;

pub mod entities;

/// Deadline for the health-check ping (template Rule 9: every await has a deadline).
const PING_TIMEOUT: Duration = Duration::from_secs(2);

/// Opens the Postgres pool with explicit timeouts.
///
/// # Errors
/// Returns the driver error if Postgres is unreachable or rejects the login.
pub async fn connect(config: &Config) -> Result<DatabaseConnection, DbErr> {
    let mut opt = ConnectOptions::new(config.database_url.expose_secret());
    opt.max_connections(config.db_max_conns)
        .min_connections(1)
        .connect_timeout(Duration::from_secs(5))
        .acquire_timeout(Duration::from_secs(5))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(3600))
        .sqlx_logging(false); // query logging via tracing instead
    Database::connect(opt).await
}

/// Checks the database answers within [`PING_TIMEOUT`].
///
/// # Errors
/// Returns an error if the ping fails or times out.
pub async fn ping(db: &DatabaseConnection) -> anyhow::Result<()> {
    // Two layers of Result: the outer one is "did it finish in time", the
    // inner one is "did the ping succeed". `??`-style unwrapping, spelled out.
    tokio::time::timeout(PING_TIMEOUT, db.ping())
        .await
        .context("database ping timed out")?
        .context("database ping failed")
}
