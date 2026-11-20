//! Crop cycles: one crop on one plot, from planning to harvest, owner-only.
//!
//! `GET /api/v1/crop-cycles`, `GET`/`POST /api/v1/plots/{plotId}/crop-cycles`,
//! `GET`/`PATCH /api/v1/crop-cycles/{cycleId}`. Rules (crop, customCrop,
//! variety, planting-date window, starting status, forward-only status, one
//! open cycle per plot) come from `falcon_core::crop_cycle`; the calendar from
//! `falcon_core::calendar`. A cycle is the caller's only when its plot's farm
//! is; anyone else's answers 404, never 403.

pub mod handler;
pub mod model;
pub mod repository;
pub mod service;

pub use repository::Repository;
pub use service::Service;
