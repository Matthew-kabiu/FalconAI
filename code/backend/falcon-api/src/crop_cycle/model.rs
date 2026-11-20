//! Crop-cycle DTOs: what clients send and what they get back.

use chrono::NaiveDate;
use falcon_core::calendar::CropCalendar;
use sea_orm::prelude::{DateTimeWithTimeZone, Uuid};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::http::extract::nullable;

/// `POST /api/v1/plots/{plotId}/crop-cycles` body (`CropCycleInput`).
///
/// No `#[validate]` rules: every rule lives in `falcon-core` (the service
/// calls `NewCropCycle::parse`). `Validate` is derived only so
/// `ValidatedJson` gives malformed JSON or a missing field the standard 400.
#[derive(Debug, Clone, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CropCycleInput {
    /// A crop slug. A plain string so an unknown crop is a 422
    /// `invalid_choice` from `falcon-core`, not a 400 from the JSON parser.
    pub crop: String,
    /// The farmer's name for an `other` crop.
    pub custom_crop: Option<String>,
    /// Optional variety, up to 80 characters.
    pub variety: Option<String>,
    /// Planting date, `YYYY-MM-DD`. A date that is not a real date (or not in
    /// that format) is a 400, like any field of the wrong type.
    pub planted_on: NaiveDate,
}

/// `PATCH /api/v1/crop-cycles/{cycleId}` body (`CropCyclePatch`). Only sent
/// fields change; the crop itself cannot.
#[derive(Debug, Clone, Default, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CropCyclePatch {
    /// Absent: unchanged. `null` or empty: cleared. Text: set.
    #[serde(default, deserialize_with = "nullable")]
    pub variety: Option<Option<String>>,
    /// New planting date.
    pub planted_on: Option<NaiveDate>,
    /// New status slug; it may only move forward.
    pub status: Option<String>,
}

/// `?status=open|closed` on `GET /api/v1/crop-cycles`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StatusFilter {
    /// Planned or active.
    Open,
    /// Harvested or abandoned.
    Closed,
}

/// The status filter query. Any other `status` value is a 400 (the enum
/// above refuses it while parsing). Paging is read separately (`PageQuery`)
/// from the same query string.
#[derive(Debug, Clone, Copy, Default, Deserialize, Validate)]
pub struct CycleListQuery {
    /// Leave out for every cycle.
    pub status: Option<StatusFilter>,
}

/// A crop cycle as clients see it (`CropCycle` in the contract), with its
/// plot's and farm's names so a list needs no extra requests.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CropCycle {
    /// Cycle id.
    pub id: Uuid,
    /// The plot it is on.
    pub plot_id: Uuid,
    /// The plot's farm.
    pub farm_id: Uuid,
    /// The plot's name.
    pub plot_name: String,
    /// The farm's name.
    pub farm_name: String,
    /// Crop slug.
    pub crop: String,
    /// The farmer's name for an `other` crop, else null.
    pub custom_crop: Option<String>,
    /// Variety, or null.
    pub variety: Option<String>,
    /// Planting date. chrono writes a `NaiveDate` as `YYYY-MM-DD` (its serde
    /// support is switched on through SeaORM's `with-json` feature).
    pub planted_on: NaiveDate,
    /// `planned`, `active`, `harvested` or `abandoned`.
    pub status: String,
    /// When it was created.
    pub created_at: DateTimeWithTimeZone,
    /// When it last changed.
    pub updated_at: DateTimeWithTimeZone,
}

/// One crop cycle with its season totals and calendar (`CropCycleDetail`).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CropCycleDetail {
    /// `flatten` writes the cycle's fields at this level, like
    /// `{ ...cycle, seasonCostKes, … }` in JavaScript.
    #[serde(flatten)]
    pub cycle: CropCycle,
    /// Sum of this cycle's activity costs, whole KES (activities without a
    /// cost count as 0).
    pub season_cost_kes: i64,
    /// Number of activities logged.
    pub activity_count: u64,
    /// The crop calendar, or null when the crop has no sourced calendar.
    pub calendar: Option<CropCalendar>,
}
