//! Logging setup (template §14): JSON in production, pretty text otherwise.
//!
//! Replaces Winston. The per-request span from `TraceLayer` carries the
//! request ID into every log line inside it, with no manual threading.
//! (This module is `platform::tracing`; the `tracing` crate itself is still
//! reached as `::tracing` / `tracing::info!` everywhere else.)

use tracing_subscriber::EnvFilter;

use crate::config::Config;

/// Installs the global log subscriber. Call once, at startup, from `main`.
pub fn init(config: &Config) {
    let filter = EnvFilter::try_new(&config.log_level).unwrap_or_else(|_| EnvFilter::new("info"));
    let fmt = tracing_subscriber::fmt().with_env_filter(filter);
    if config.is_production() {
        fmt.json().init();
    } else {
        fmt.pretty().init();
    }
}
