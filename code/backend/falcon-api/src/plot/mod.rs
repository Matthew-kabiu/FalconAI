//! Plots: the named pieces of a farm, owner-only.
//!
//! `POST /api/v1/farms/{farmId}/plots`, `PATCH` and `DELETE /api/v1/plots/{plotId}`.
//! A farm's plots are listed by `GET /api/v1/farms/{farmId}` (see `farm`).
//! Rules (name, size, unit, notes, "no delete while it has crop cycles")
//! come from `falcon_core::plot`.

pub mod handler;
pub mod model;
pub mod repository;
pub mod service;

pub use repository::Repository;
pub use service::Service;
