//! Farm DTOs: what clients send and what they get back.

use sea_orm::prelude::{DateTimeWithTimeZone, Uuid};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::http::extract::nullable;
use crate::plot::model::Plot;

/// `POST /api/v1/farms` body (`FarmInput` in the contract).
///
/// No `#[validate]` rules: every rule lives in `falcon-core` (the service
/// calls `NewFarm::parse`). `Validate` is derived only so `ValidatedJson`
/// gives malformed JSON or a missing field the standard 400 envelope.
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct FarmInput {
    /// 1 to 80 characters after trimming.
    pub name: String,
    /// A county slug. A plain string so an unknown county is a 422
    /// `invalid_choice` from `falcon-core`, not a 400 from the JSON parser.
    pub county: String,
    /// Optional village or area, up to 80 characters.
    pub locality: Option<String>,
}

/// `PATCH /api/v1/farms/{farmId}` body (`FarmPatch`). Only sent fields change.
#[derive(Debug, Clone, Default, Deserialize, Validate)]
pub struct FarmPatch {
    /// New name.
    pub name: Option<String>,
    /// New county slug.
    pub county: Option<String>,
    /// Absent: unchanged. `null` or empty: cleared. Text: set.
    #[serde(default, deserialize_with = "nullable")]
    pub locality: Option<Option<String>>,
}

/// A farm as clients see it (`Farm` in the contract).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Farm {
    /// Farm id.
    pub id: Uuid,
    /// Name.
    pub name: String,
    /// County slug, e.g. `kiambu`.
    pub county: String,
    /// Village or area, or null.
    pub locality: Option<String>,
    /// Number of plots on this farm, counted by the database.
    pub plot_count: u64,
    /// When it was created.
    pub created_at: DateTimeWithTimeZone,
    /// When it last changed.
    pub updated_at: DateTimeWithTimeZone,
}

/// One farm with all its plots (`FarmDetail`): the `Farm` fields plus `plots`.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct FarmDetail {
    /// `flatten` writes the farm's fields at this level instead of under a
    /// `farm` key, like `{ ...farm, plots }` in JavaScript.
    #[serde(flatten)]
    pub farm: Farm,
    /// The farm's plots, sorted by name.
    pub plots: Vec<Plot>,
}
