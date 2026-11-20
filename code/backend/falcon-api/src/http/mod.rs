//! HTTP transport plumbing: routing, envelopes, extractors, middleware,
//! and the server loop. No business logic lives here.

pub mod extract;
pub mod middleware;
pub mod respond;
mod router;

use axum::Router;

use crate::config::Config;

pub use router::router;

/// Binds `0.0.0.0:PORT` and serves until SIGTERM or Ctrl-C (template §15).
///
/// `with_graceful_shutdown` stops accepting new connections and drains
/// in-flight requests; the `TimeoutLayer` bounds how long a drain can take.
///
/// # Errors
/// Returns an error if the port cannot be bound or the server fails.
pub async fn serve(app: Router, config: &Config) -> anyhow::Result<()> {
    let listener = tokio::net::TcpListener::bind(("0.0.0.0", config.port)).await?;
    tracing::info!(port = config.port, "listening");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

// Resolves on the first of Ctrl-C or SIGTERM (what `docker stop` sends).
// If a handler cannot be installed, that branch waits forever instead of
// panicking, so the other signal still works.
async fn shutdown_signal() {
    let ctrl_c = async {
        if let Err(e) = tokio::signal::ctrl_c().await {
            tracing::error!(error = %e, "cannot listen for ctrl-c");
            std::future::pending::<()>().await;
        }
    };

    #[cfg(unix)]
    let term = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut sigterm) => {
                sigterm.recv().await;
            }
            Err(e) => {
                tracing::error!(error = %e, "cannot listen for SIGTERM");
                std::future::pending::<()>().await;
            }
        }
    };
    #[cfg(not(unix))]
    let term = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {},
        () = term => {},
    }
    tracing::info!("shutdown signal received");
}
