//! Activities: the work, inputs, quantities and costs logged against a crop
//! cycle, owner-only.
//!
//! `GET`/`POST /api/v1/crop-cycles/{cycleId}/activities`, `PATCH`/`DELETE
//! /api/v1/activities/{activityId}`. Rules come from `falcon_core::activity`.
//! An activity is the caller's only when its cycle is (its plot's farm is
//! theirs); anyone else's answers 404, never 403.

pub mod handler;
pub mod model;
pub mod repository;
pub mod service;

pub use repository::Repository;
pub use service::Service;
