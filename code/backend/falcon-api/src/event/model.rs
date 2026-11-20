//! Event DTOs: what clients send and what they get back.

use chrono::NaiveDate;
use sea_orm::prelude::{DateTimeWithTimeZone, Uuid};
use serde::{Deserialize, Serialize};
use validator::Validate;

use crate::http::extract::nullable;

/// `POST /api/v1/events` body (`EventInput`).
///
/// No `#[validate]` rules: every rule lives in `falcon-core` (the service
/// calls `NewEvent::parse`). `Validate` is derived only so `ValidatedJson`
/// gives malformed JSON or a missing field the standard 400.
#[derive(Debug, Clone, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct EventInput {
    /// The farmer's own words.
    pub title: String,
    /// What the event is about.
    pub description: Option<String>,
    /// Kenya date, `YYYY-MM-DD`.
    pub date: NaiveDate,
    /// `HH:MM`, Kenya time. A plain string so a bad time is a 422
    /// `invalid_choice` from `falcon-core`, not a 400 from the JSON parser.
    pub time: Option<String>,
    /// The crop this event is about. Must be the caller's (404 otherwise).
    /// A malformed UUID is a 400, like any field of the wrong type.
    pub cycle_id: Option<Uuid>,
    /// Free notes.
    pub notes: Option<String>,
}

/// `PATCH /api/v1/events/{eventId}` body (`EventPatch`). Only sent fields
/// change; `null` clears `description`, `time`, `cycleId` or `notes`.
#[derive(Debug, Clone, Default, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct EventPatch {
    /// New title.
    pub title: Option<String>,
    /// Absent: unchanged. `null` or empty: cleared. Text: set.
    #[serde(default, deserialize_with = "nullable")]
    pub description: Option<Option<String>>,
    /// New Kenya date.
    pub date: Option<NaiveDate>,
    /// Absent: unchanged. `null`: cleared. `HH:MM`: set.
    #[serde(default, deserialize_with = "nullable")]
    pub time: Option<Option<String>>,
    /// Absent: unchanged. `null`: unlinked. Id: linked (must be the caller's).
    #[serde(default, deserialize_with = "nullable")]
    pub cycle_id: Option<Option<Uuid>>,
    /// Absent: unchanged. `null` or empty: cleared. Text: set.
    #[serde(default, deserialize_with = "nullable")]
    pub notes: Option<Option<String>>,
}

/// An event as clients see it (`Event` in the contract), with its linked
/// crop's names so the client needs no extra request.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    /// Event id.
    pub id: Uuid,
    /// The farmer's own words.
    pub title: String,
    /// What the event is about, or null.
    pub description: Option<String>,
    /// Kenya date.
    pub date: NaiveDate,
    /// `HH:MM`, Kenya time, or null.
    pub time: Option<String>,
    /// The linked crop cycle, or null.
    pub cycle_id: Option<Uuid>,
    /// The linked cycle's crop slug, or null.
    pub crop: Option<String>,
    /// The linked cycle's name for an `other` crop, else null.
    pub custom_crop: Option<String>,
    /// The linked cycle's plot name, or null.
    pub plot_name: Option<String>,
    /// Notes, or null.
    pub notes: Option<String>,
    /// When it was created.
    pub created_at: DateTimeWithTimeZone,
    /// When it last changed.
    pub updated_at: DateTimeWithTimeZone,
}

/// An event plus its linked cycle's farm name, as the farm calendar needs
/// it. Not sent on its own: `Event` in the contract has no farm name.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CalendarEvent {
    /// The event.
    pub event: Event,
    /// The linked cycle's farm name, or `None` when not linked.
    pub farm_name: Option<String>,
}
