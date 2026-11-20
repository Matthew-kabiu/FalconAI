//! Shared application state (template §6).
//!
//! Node would use module singletons. Rust has no safe global mutable state, so
//! everything is built once in `main`, put in this struct, wrapped in an `Arc`
//! (a thread-safe shared pointer), and handed to each handler by Axum.

use std::time::Duration;

use anyhow::Context;
use sea_orm::DatabaseConnection;

use crate::config::Config;
use crate::platform::clerk;
use crate::{activity, calendar, crop_cycle, event, farm, plot};

/// Whole-request deadline for every outbound HTTP call (template §7).
const HTTP_TIMEOUT: Duration = Duration::from_secs(10);
/// Deadline for opening a TCP/TLS connection.
const HTTP_CONNECT_TIMEOUT: Duration = Duration::from_secs(3);

/// Everything a handler may need. Shared as `Arc<AppState>`.
pub struct AppState {
    /// Validated configuration.
    pub config: Config,
    /// Database handle. SeaORM's connection is already a pool, so it needs no lock.
    pub db: DatabaseConnection,
    /// The one outbound HTTP client (template §22), with timeouts set.
    pub http: reqwest::Client,
    /// Clerk session-token verifier, used by the `AuthUser` extractor.
    pub clerk: clerk::Verifier,
    /// Farm use cases.
    pub farms: farm::Service,
    /// Plot use cases.
    pub plots: plot::Service,
    /// Crop-cycle use cases.
    pub crop_cycles: crop_cycle::Service,
    /// Activity use cases.
    pub activities: activity::Service,
    /// Calendar-event use cases.
    pub events: event::Service,
    /// Farm-calendar use cases.
    pub calendar: calendar::Service,
}

impl AppState {
    /// Wires the services together — the only place the graph is assembled.
    ///
    /// # Errors
    /// Returns an error if the HTTP client cannot be built (TLS setup failed).
    pub fn new(config: Config, db: DatabaseConnection) -> anyhow::Result<Self> {
        let http = reqwest::Client::builder()
            .timeout(HTTP_TIMEOUT)
            .connect_timeout(HTTP_CONNECT_TIMEOUT)
            // Template §9.1 A10: never follow redirects to an unexpected host.
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .context("build HTTP client")?;
        // Cloning a reqwest::Client copies a handle to the same connection
        // pool, so the verifier and AppState share one client.
        let clerk = clerk::Verifier::new(&config.clerk_issuer, &config.cors_origins, http.clone());
        let services = services(&db);
        Ok(Self {
            config,
            db,
            http,
            clerk,
            farms: services.farms,
            plots: services.plots,
            crop_cycles: services.crop_cycles,
            activities: services.activities,
            events: services.events,
            calendar: services.calendar,
        })
    }
}

/// Every service, built on one connection pool by [`services`].
#[derive(Debug, Clone)]
pub struct Services {
    /// Farm use cases.
    pub farms: farm::Service,
    /// Plot use cases.
    pub plots: plot::Service,
    /// Crop-cycle use cases.
    pub crop_cycles: crop_cycle::Service,
    /// Activity use cases.
    pub activities: activity::Service,
    /// Calendar-event use cases.
    pub events: event::Service,
    /// Farm-calendar use cases.
    pub calendar: calendar::Service,
}

/// Builds every service on one connection pool. Separate from
/// [`AppState::new`] so tests can build the same graph around a stand-in
/// verifier. Cloning a `DatabaseConnection` copies a handle to the same pool.
#[must_use]
pub fn services(db: &DatabaseConnection) -> Services {
    let plot_repo = plot::Repository::new(db.clone());
    let cycle_repo = crop_cycle::Repository::new(db.clone());
    let activity_repo = activity::Repository::new(db.clone());
    let event_repo = event::Repository::new(db.clone());
    Services {
        farms: farm::Service::new(farm::Repository::new(db.clone()), plot_repo.clone()),
        plots: plot::Service::new(plot_repo),
        crop_cycles: crop_cycle::Service::new(cycle_repo.clone()),
        activities: activity::Service::new(activity_repo.clone(), cycle_repo.clone()),
        events: event::Service::new(event_repo.clone(), cycle_repo.clone()),
        calendar: calendar::Service::new(cycle_repo, activity_repo, event_repo),
    }
}
