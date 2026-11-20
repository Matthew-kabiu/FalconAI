//! Activity DTOs: what clients send and what they get back.

use chrono::NaiveDate;
use falcon_core::activity::Quantity;
use sea_orm::prelude::{DateTimeWithTimeZone, Uuid};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::db::entities::activities;
use crate::http::extract::nullable;
use crate::http::respond::PageMeta;

/// `POST /api/v1/crop-cycles/{cycleId}/activities` body (`ActivityInput`).
///
/// No `#[validate]` rules: every rule lives in `falcon-core` (the service
/// calls `NewActivity::parse`). `Validate` is derived only so
/// `ValidatedJson` gives malformed JSON or a missing field the standard 400.
#[derive(Debug, Clone, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ActivityInput {
    /// Kind slug. A plain string so an unknown kind is a 422 `invalid_choice`.
    pub kind: String,
    /// The day the work was done, `YYYY-MM-DD`.
    pub done_on: NaiveDate,
    /// What was used, e.g. DAP or certified seed.
    pub input: Option<String>,
    /// How much, in `quantity_unit`.
    pub quantity: Option<f64>,
    /// Unit slug of `quantity`.
    pub quantity_unit: Option<String>,
    /// Whole shillings. A fraction (`12.5`) is a 400: the field is an integer.
    pub cost_kes: Option<i64>,
    /// Free notes.
    pub notes: Option<String>,
}

/// `PATCH /api/v1/activities/{activityId}` body (`ActivityPatch`). Only sent
/// fields change; `null` clears an optional field.
#[derive(Debug, Clone, Default, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct ActivityPatch {
    /// New kind slug.
    pub kind: Option<String>,
    /// New day.
    pub done_on: Option<NaiveDate>,
    /// Absent: unchanged. `null` or empty: cleared. Text: set.
    #[serde(default, deserialize_with = "nullable")]
    pub input: Option<Option<String>>,
    /// Absent: unchanged. `null`: cleared (with its unit). Number: set.
    #[serde(default, deserialize_with = "nullable")]
    pub quantity: Option<Option<f64>>,
    /// Absent: unchanged. `null`: cleared. Slug: set.
    #[serde(default, deserialize_with = "nullable")]
    pub quantity_unit: Option<Option<String>>,
    /// Absent: unchanged. `null`: cleared. Number: set.
    #[serde(default, deserialize_with = "nullable")]
    pub cost_kes: Option<Option<i64>>,
    /// Absent: unchanged. `null` or empty: cleared. Text: set.
    #[serde(default, deserialize_with = "nullable")]
    pub notes: Option<Option<String>>,
}

/// An activity as clients see it (`Activity` in the contract).
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    /// Activity id.
    pub id: Uuid,
    /// The crop cycle it belongs to.
    pub cycle_id: Uuid,
    /// Kind slug.
    pub kind: String,
    /// The day it was done.
    pub done_on: NaiveDate,
    /// What was used, or null.
    pub input: Option<String>,
    /// How much (at most 2 decimal places), or null.
    pub quantity: Option<f64>,
    /// Unit slug, or null (null exactly when `quantity` is).
    pub quantity_unit: Option<String>,
    /// Whole shillings, or null.
    pub cost_kes: Option<i64>,
    /// Notes, or null.
    pub notes: Option<String>,
    /// When it was created.
    pub created_at: DateTimeWithTimeZone,
    /// When it last changed.
    pub updated_at: DateTimeWithTimeZone,
}

/// The mapper from a database row (template §12.3).
impl From<activities::Model> for Activity {
    fn from(m: activities::Model) -> Self {
        Self {
            id: m.id,
            cycle_id: m.cycle_id,
            kind: m.kind,
            done_on: m.done_on,
            input: m.input,
            // Stored as whole hundredths; falcon-core owns the scale.
            quantity: m.quantity_hundredths.map(Quantity::value_of_hundredths),
            quantity_unit: m.quantity_unit,
            cost_kes: m.cost_kes,
            notes: m.notes,
            created_at: m.created_at,
            updated_at: m.updated_at,
        }
    }
}

/// `meta` of the activity list (`ActivityPageMeta`): the paging fields plus
/// the season total over ALL the cycle's activities, not just this page.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityPageMeta {
    /// `page`, `perPage`, `total`, written at this level by `flatten`.
    #[serde(flatten)]
    pub page: PageMeta,
    /// Sum of every activity's cost in the cycle, whole KES.
    pub total_cost_kes: i64,
}
