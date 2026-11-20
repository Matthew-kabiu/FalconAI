//! The whole-farm calendar, owner-only.
//!
//! `GET /api/v1/calendar`: every open crop (planned or active) on every one
//! of the caller's plots, merged into one dated list — each crop's growth
//! stages and field tasks from its sourced table (`falcon_core::calendar`),
//! plus the activities already logged on those crops. The window rule
//! (defaults, largest span) comes from `falcon_core::farm_calendar`.
//!
//! No repository of its own: the cycles come from
//! `crop_cycle::Repository::list_open` and the activities from
//! `activity::Repository::list_on_open_cycles`, both owner-only.

pub mod handler;
pub mod model;
pub mod service;

pub use service::Service;
