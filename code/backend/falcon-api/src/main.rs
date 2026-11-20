//! `api` binary: wiring only (template §4.1, §6). Build state, router, run.

use std::sync::Arc;

use falcon_api::{config::Config, db, health, http, platform, state::AppState};
use migration::{Migrator, MigratorTrait};

/// Entry point.
///
/// `api --health` is the Docker healthcheck (template §20.2): the distroless
/// image has no shell or `wget`, so the binary probes itself and exits 0 or 1.
/// It is checked before the tokio runtime starts because the probe is plain,
/// blocking std code and needs no async runtime.
fn main() -> anyhow::Result<()> {
    if std::env::args().skip(1).any(|arg| arg == "--health") {
        std::process::exit(health::probe::run());
    }
    run()
}

/// Starts the service. `#[tokio::main]` builds the async runtime (Node has one
/// built in; Rust makes you pick one) and runs this function on it.
#[tokio::main]
async fn run() -> anyhow::Result<()> {
    let config = Config::load()?; // fails fast on bad env
    platform::tracing::init(&config);

    let db = db::connect(&config).await?;
    Migrator::up(&db, None).await?; // migrate before serving

    // Wiring — the only place the graph is assembled (see AppState::new).
    let state = Arc::new(AppState::new(config, db)?);
    // Cloning an Arc copies a pointer, not the state: the router keeps one
    // handle, and we keep another to read the config below.
    let app = http::router(state.clone());

    http::serve(app, &state.config).await // graceful shutdown inside
}
