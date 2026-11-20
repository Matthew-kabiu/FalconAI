//! Falcon AI domain core.
//!
//! This crate holds Falcon AI's business rules: domain types (farm, plot, crop
//! cycle, activity, assessment result), validation, crop-calendar and
//! growth-stage rules, and the rule for when an AI assessment must ask for a
//! better photo or go to human review.
//!
//! # The rule for what belongs here
//!
//! **Could it run on a phone with no network and no server?** If yes, it
//! belongs in `falcon-core`. If it needs the database, the network, secrets or
//! the AI model, it belongs in `falcon-api`.
//!
//! The same crate will later be compiled into the Android and iOS apps, so the
//! phone runs exactly the same rules offline. That is why this crate:
//!
//! - is synchronous (no `async`, no `tokio`);
//! - does no I/O (no files, sockets, database or HTTP);
//! - depends only on `serde`, `uuid`, `chrono` and `thiserror`.
//!
//! `falcon-api` services call into this crate for every business rule instead
//! of re-implementing it.
//!
//! Modules: [`farm`] and [`plot`] (with [`county`]) for farms and plots,
//! [`crop`] for the crop catalogue, [`crop_cycle`] and [`activity`] for what
//! is planted and done, [`event`] for the farmer's own calendar events,
//! [`calendar`] for the crop-calendar engine (its data
//! lives in the private `calendar_data` module), [`farm_calendar`] for the
//! whole-farm calendar's date window, [`user`] for farmer
//! profiles, [`role`] for permissions, [`error`] for the error and
//! field-issue types every rule returns.
//!
//! Rules that depend on the date take "today" as a parameter: this crate
//! never reads a clock, so the caller decides the time zone (Kenya time in
//! `falcon-api`) and tests can pin the date.

pub mod activity;
pub mod calendar;
mod calendar_data;
pub mod county;
pub mod crop;
pub mod crop_cycle;
pub mod error;
pub mod event;
pub mod farm;
pub mod farm_calendar;
pub mod plot;
pub mod role;
mod text;
pub mod user;

pub use county::County;
pub use crop::Crop;
pub use error::{CoreError, FieldIssue, IssueCode};
pub use role::Role;
