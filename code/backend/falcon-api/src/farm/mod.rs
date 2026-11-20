//! Farms: each farmer's own farms, owner-only.
//!
//! `GET`/`POST /api/v1/farms`, `GET`/`PATCH`/`DELETE /api/v1/farms/{farmId}`.
//! Rules (name, county, locality, "no delete while it has plots") come from
//! `falcon_core::farm`. Another farmer's farm answers 404, never 403.

pub mod handler;
pub mod model;
pub mod repository;
pub mod service;

pub use repository::Repository;
pub use service::Service;
