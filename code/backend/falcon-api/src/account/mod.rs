//! The signed-in user's own account: `GET /api/v1/me`.
//!
//! Identity comes from the Clerk session token (see `platform::clerk`), so
//! there is no service or repository yet: nothing here touches the database
//! or applies a business rule. They arrive with the first stored profile data.

pub mod handler;
pub mod model;
