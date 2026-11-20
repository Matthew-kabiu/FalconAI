//! Calendar events: things the farmer puts on the farm calendar themselves,
//! owner-only.
//!
//! `POST /api/v1/events`, `GET`/`PATCH`/`DELETE /api/v1/events/{eventId}`.
//! Rules come from `falcon_core::event`. An event stores its owner directly
//! (it may have no crop) and every query filters on `events.owner_id`;
//! anyone else's event answers 404, never 403. A linked crop cycle must be
//! the caller's too (404 otherwise), checked through the owner-only cycle
//! lookup. Events also appear on the whole-farm calendar (`calendar`).

pub mod handler;
pub mod model;
pub mod repository;
pub mod service;

pub use repository::Repository;
pub use service::Service;
