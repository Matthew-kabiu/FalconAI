//! Plot DTOs: what clients send and what they get back.

use falcon_core::plot::PlotSize;
use sea_orm::prelude::{DateTimeWithTimeZone, Uuid};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::db::entities::plots;
use crate::http::extract::nullable;

/// `POST /api/v1/farms/{farmId}/plots` body (`PlotInput` in the contract).
///
/// No `#[validate]` rules: every rule lives in `falcon-core` (the service
/// calls `NewPlot::parse`). `Validate` is derived only so `ValidatedJson`
/// gives malformed JSON or a missing field the standard 400 envelope.
#[derive(Debug, Clone, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct PlotInput {
    /// 1 to 80 characters after trimming.
    pub name: String,
    /// Greater than 0, at most 1000, in `size_unit`.
    pub size: f64,
    /// `acres`, `hectares` or `plots_50x100`. A plain string so an unknown unit is a 422
    /// `invalid_choice` from `falcon-core`, not a 400 from the JSON parser.
    pub size_unit: String,
    /// Optional notes, up to 500 characters.
    pub notes: Option<String>,
}

/// `PATCH /api/v1/plots/{plotId}` body (`PlotPatch`). Only sent fields change.
#[derive(Debug, Clone, Default, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct PlotPatch {
    /// New name.
    pub name: Option<String>,
    /// New size.
    pub size: Option<f64>,
    /// New size unit.
    pub size_unit: Option<String>,
    /// Absent: unchanged. `null` or empty: cleared. Text: set.
    #[serde(default, deserialize_with = "nullable")]
    pub notes: Option<Option<String>>,
}

/// A plot as clients see it (`Plot` in the contract).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Plot {
    /// Plot id.
    pub id: Uuid,
    /// The farm it belongs to.
    pub farm_id: Uuid,
    /// Name.
    pub name: String,
    /// Size in `size_unit`, at most 2 decimal places.
    pub size: f64,
    /// `acres`, `hectares` or `plots_50x100` (number of 50 by 100 ft plots).
    pub size_unit: String,
    /// Notes, or null.
    pub notes: Option<String>,
    /// When it was created.
    pub created_at: DateTimeWithTimeZone,
    /// When it last changed.
    pub updated_at: DateTimeWithTimeZone,
}

/// The mapper from a database row (template §12.3): entity `Model`s never
/// reach the transport layer.
impl From<plots::Model> for Plot {
    fn from(m: plots::Model) -> Self {
        Self {
            id: m.id,
            farm_id: m.farm_id,
            name: m.name,
            // Stored as whole hundredths (0.5 acres = 50); falcon-core owns the scale.
            size: PlotSize::value_of_hundredths(m.size_hundredths),
            size_unit: m.size_unit,
            notes: m.notes,
            created_at: m.created_at,
            updated_at: m.updated_at,
        }
    }
}
