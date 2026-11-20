//! Farm-calendar DTOs: the query clients send and what they get back.

use chrono::NaiveDate;
use falcon_core::farm_calendar::EntryKind;
use sea_orm::prelude::Uuid;
use serde::{Deserialize, Serialize};
use validator::Validate;

/// `?from=&to=` on `GET /api/v1/calendar`, both `YYYY-MM-DD` and optional.
///
/// A malformed date is a 400 from `ValidatedQuery`. The window rules (from
/// on or before to, at most 180 days) live in `falcon-core` and are checked
/// by the service, also as a 400. `Validate` is derived only so
/// `ValidatedQuery` accepts the type.
#[derive(Debug, Clone, Copy, Default, Deserialize, Validate)]
pub struct CalendarQuery {
    /// First day; today − 14 days when left out.
    pub from: Option<NaiveDate>,
    /// Last day (included); today + 60 days when left out.
    pub to: Option<NaiveDate>,
}

/// One dated line of the farm calendar (`FarmCalendarEntry`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FarmCalendarEntry {
    /// `stage`, `task`, `activity` or `event`.
    pub kind: EntryKind,
    /// Stage key, task key, the activity kind slug, or `event`. Clients
    /// translate it.
    pub key: String,
    /// First day.
    pub starts_on: NaiveDate,
    /// Last day (included). Equal to `starts_on` for an activity or event.
    pub ends_on: NaiveDate,
    /// The crop cycle it belongs to; null only for an event not linked to a crop.
    pub cycle_id: Option<Uuid>,
    /// Crop slug; null only for an event not linked to a crop.
    pub crop: Option<String>,
    /// The farmer's name for an `other` crop, else null.
    pub custom_crop: Option<String>,
    /// The cycle's plot name; null only for an event not linked to a crop.
    pub plot_name: Option<String>,
    /// The plot's farm name; null only for an event not linked to a crop.
    pub farm_name: Option<String>,
    /// The event's id; set only for an event.
    pub event_id: Option<Uuid>,
    /// The farmer's own words; set only for an event.
    pub title: Option<String>,
    /// `HH:MM`, Kenya time; set only for an event that has a time.
    pub time: Option<String>,
    /// The activity's id; null for a stage or task.
    pub activity_id: Option<Uuid>,
    /// The activity's cost in whole KES; null for a stage or task (and for an
    /// activity logged without a cost).
    pub cost_kes: Option<i64>,
    /// For a stage or task: false until an agricultural professional has
    /// checked the table. Always true for an activity or event (the farmer
    /// wrote it).
    pub reviewed: bool,
}

/// The farm calendar for one window (`FarmCalendar`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FarmCalendar {
    /// First day of the window.
    pub from: NaiveDate,
    /// Last day of the window (included).
    pub to: NaiveDate,
    /// The Kenya date the server used.
    pub today: NaiveDate,
    /// Every stage, task, activity and event in the window, sorted.
    pub entries: Vec<FarmCalendarEntry>,
    /// How many open crops have no sourced table (including every `other`
    /// crop), so the client can say they are not shown.
    pub crops_without_calendar: u64,
    /// Always `Africa/Nairobi`: every date and time above is Kenya time.
    pub time_zone: &'static str,
}
