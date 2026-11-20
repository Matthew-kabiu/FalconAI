//! The crop catalogue: `GET /api/v1/crops`.
//!
//! The catalogue is data in `falcon_core::crop`, the same on the server and
//! (later) on the phone, so there is no service, repository or table here.
//! Clients translate each slug; this API sends no display names.

pub mod handler;
