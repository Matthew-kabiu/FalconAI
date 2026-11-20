//! Farm-calendar business logic (template §5.2). The window rule comes from
//! `falcon_core::farm_calendar`, each crop's dated stages and tasks from
//! `falcon_core::calendar`; this layer supplies "today" (Kenya time), reads
//! the caller's open cycles, their activities and the caller's own events,
//! and merges them.

use std::cmp::Ordering;
use std::collections::HashMap;

use chrono::NaiveDate;
use falcon_core::calendar::{self, DatedSpan};
use falcon_core::crop::Crop;
use falcon_core::farm_calendar::{EntryKind, TIME_ZONE, Window};
use sea_orm::prelude::Uuid;

use crate::activity;
use crate::activity::model::Activity;
use crate::calendar::model::{FarmCalendar, FarmCalendarEntry};
use crate::crop_cycle;
use crate::crop_cycle::model::CropCycle;
use crate::error::AppError;
use crate::event;
use crate::event::model::CalendarEvent;
use crate::platform::clock::today_in_kenya;

/// The `key` of every event entry. Clients translate it like any other key.
const EVENT_KEY: &str = "event";

/// Farm-calendar use cases. Built once in `AppState::new`.
#[derive(Debug, Clone)]
pub struct Service {
    cycles: crop_cycle::Repository,
    activities: activity::Repository,
    events: event::Repository,
}

impl Service {
    /// Wires the service to the crop-cycle, activity and event repositories.
    #[must_use]
    pub fn new(
        cycles: crop_cycle::Repository,
        activities: activity::Repository,
        events: event::Repository,
    ) -> Self {
        Self {
            cycles,
            activities,
            events,
        }
    }

    /// `owner`'s farm calendar from `from` to `to` (each defaulted when
    /// `None`). At most three queries, whatever the number of crops or
    /// events: the open cycles with their names, their activities in the
    /// window (skipped when there is no open cycle), and the caller's events
    /// in the window with their linked crop's names (always run: an event
    /// need not have a crop, and its crop may be closed).
    ///
    /// # Errors
    /// 400 when `from` is after `to` or the window spans more than 180 days
    /// (checked before the database is touched); 500 on a database failure.
    pub async fn farm(
        &self,
        owner: &str,
        from: Option<NaiveDate>,
        to: Option<NaiveDate>,
    ) -> Result<FarmCalendar, AppError> {
        let today = today_in_kenya();
        // A window mistake is a query-string mistake: 400, like a malformed date.
        let window =
            Window::resolve(from, to, today).map_err(|e| AppError::Validation(e.to_string()))?;
        let cycles = self.cycles.list_open(owner).await?;
        let activities = if cycles.is_empty() {
            Vec::new()
        } else {
            self.activities
                .list_on_open_cycles(owner, window.from(), window.to())
                .await?
        };
        let events = self
            .events
            .list_in_window(owner, window.from(), window.to())
            .await?;
        Ok(merge(window, today, &cycles, activities, events))
    }
}

/// Builds the calendar from what the database returned. Pure, so tests need
/// no database.
fn merge(
    window: Window,
    today: NaiveDate,
    cycles: &[CropCycle],
    activities: Vec<Activity>,
    events: Vec<CalendarEvent>,
) -> FarmCalendar {
    let mut entries = Vec::new();
    let mut crops_without_calendar: u64 = 0;

    for cycle in cycles {
        // An unknown stored slug (never expected) is treated like a crop
        // without a sourced table; `for_crop` is always `None` for `other`.
        let calendar = Crop::from_slug(&cycle.crop)
            .and_then(|crop| calendar::for_crop(crop, cycle.planted_on, today));
        let Some(calendar) = calendar else {
            crops_without_calendar += 1;
            continue;
        };
        let stages = calendar.stages.iter().map(|span| (EntryKind::Stage, span));
        let tasks = calendar.tasks.iter().map(|span| (EntryKind::Task, span));
        for (kind, span) in stages.chain(tasks) {
            if window.overlaps(span.starts_on, span.ends_on) {
                entries.push(table_entry(cycle, kind, span, calendar.reviewed));
            }
        }
    }

    // Activities name their cycle by id; look the names up without a query.
    let by_id: HashMap<Uuid, &CropCycle> = cycles.iter().map(|c| (c.id, c)).collect();
    for activity in activities {
        // A cycle closed between the two queries is left out with its
        // activities; the window check repeats the query's filter.
        let Some(cycle) = by_id.get(&activity.cycle_id) else {
            continue;
        };
        if window.contains(activity.done_on) {
            entries.push(activity_entry(cycle, activity));
        }
    }

    // Events carry their own crop names (open or closed crop, or none); the
    // window check repeats the query's filter.
    for event in events {
        if window.contains(event.event.date) {
            entries.push(event_entry(event));
        }
    }

    entries.sort_by(compare);
    FarmCalendar {
        from: window.from(),
        to: window.to(),
        today,
        entries,
        crops_without_calendar,
        time_zone: TIME_ZONE,
    }
}

/// A stage or task of `cycle`'s sourced table.
fn table_entry(
    cycle: &CropCycle,
    kind: EntryKind,
    span: &DatedSpan,
    reviewed: bool,
) -> FarmCalendarEntry {
    FarmCalendarEntry {
        kind,
        key: span.key.to_string(),
        starts_on: span.starts_on,
        ends_on: span.ends_on,
        cycle_id: Some(cycle.id),
        crop: Some(cycle.crop.clone()),
        custom_crop: cycle.custom_crop.clone(),
        plot_name: Some(cycle.plot_name.clone()),
        farm_name: Some(cycle.farm_name.clone()),
        event_id: None,
        title: None,
        time: None,
        activity_id: None,
        cost_kes: None,
        reviewed,
    }
}

/// A logged activity: one day, always `reviewed` (the farmer recorded it).
fn activity_entry(cycle: &CropCycle, activity: Activity) -> FarmCalendarEntry {
    FarmCalendarEntry {
        kind: EntryKind::Activity,
        key: activity.kind,
        starts_on: activity.done_on,
        ends_on: activity.done_on,
        cycle_id: Some(cycle.id),
        crop: Some(cycle.crop.clone()),
        custom_crop: cycle.custom_crop.clone(),
        plot_name: Some(cycle.plot_name.clone()),
        farm_name: Some(cycle.farm_name.clone()),
        event_id: None,
        title: None,
        time: None,
        activity_id: Some(activity.id),
        cost_kes: activity.cost_kes,
        reviewed: true,
    }
}

/// The farmer's own event: one day, always `reviewed` (the farmer wrote
/// it). The crop fields are null when it is not linked to a crop.
fn event_entry(e: CalendarEvent) -> FarmCalendarEntry {
    let CalendarEvent { event, farm_name } = e;
    FarmCalendarEntry {
        kind: EntryKind::Event,
        key: EVENT_KEY.to_string(),
        starts_on: event.date,
        ends_on: event.date,
        cycle_id: event.cycle_id,
        crop: event.crop,
        custom_crop: event.custom_crop,
        plot_name: event.plot_name,
        farm_name,
        event_id: Some(event.id),
        title: Some(event.title),
        time: event.time,
        activity_id: None,
        cost_kes: None,
        reviewed: true,
    }
}

/// Start date, then kind (stage, task, activity, event), then time (an
/// event with a time before one without), then crop slug (no crop first),
/// then key, then the ids so equal entries always come out in the same
/// order. Tuples compare field by field, left to right.
fn compare(a: &FarmCalendarEntry, b: &FarmCalendarEntry) -> Ordering {
    sort_key(a).cmp(&sort_key(b))
}

/// What [`sort_key`] returns: date, kind, (no time?, time), crop, key,
/// activity id, event id, cycle id.
type SortKey<'a> = (
    NaiveDate,
    EntryKind,
    (bool, Option<&'a str>),
    Option<&'a str>,
    &'a str,
    Option<Uuid>,
    Option<Uuid>,
    Option<Uuid>,
);

/// The fields [`compare`] orders by, borrowed (no string copies). The time
/// is `(is_none, time)` so entries without one sort last; `HH:MM` strings
/// sort in time order.
fn sort_key(e: &FarmCalendarEntry) -> SortKey<'_> {
    (
        e.starts_on,
        e.kind,
        (e.time.is_none(), e.time.as_deref()),
        e.crop.as_deref(),
        &e.key,
        e.activity_id,
        e.event_id,
        e.cycle_id,
    )
}

#[cfg(test)]
mod tests {
    use chrono::{Days, Utc};
    use falcon_core::farm_calendar::Window;
    use sea_orm::prelude::Uuid;

    use falcon_core::farm_calendar::EntryKind;

    use super::merge;
    use crate::activity::model::Activity;
    use crate::crop_cycle::model::CropCycle;
    use crate::event::model::{CalendarEvent, Event};

    fn date(y: i32, m: u32, d: u32) -> chrono::NaiveDate {
        chrono::NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    fn cycle(crop: &str, custom: Option<&str>) -> CropCycle {
        let now = Utc::now().fixed_offset();
        CropCycle {
            id: Uuid::new_v4(),
            plot_id: Uuid::new_v4(),
            farm_id: Uuid::new_v4(),
            plot_name: "Plot".to_string(),
            farm_name: "Farm".to_string(),
            crop: crop.to_string(),
            custom_crop: custom.map(str::to_string),
            variety: None,
            planted_on: date(2026, 10, 1),
            status: "active".to_string(),
            created_at: now,
            updated_at: now,
        }
    }

    fn activity(cycle_id: Uuid, kind: &str, done_on: chrono::NaiveDate) -> Activity {
        let now = Utc::now().fixed_offset();
        Activity {
            id: Uuid::new_v4(),
            cycle_id,
            kind: kind.to_string(),
            done_on,
            input: None,
            quantity: None,
            quantity_unit: None,
            cost_kes: Some(500),
            notes: None,
            created_at: now,
            updated_at: now,
        }
    }

    /// An event on `date`, optionally at `time` and linked to `cycle`.
    fn event(
        date: chrono::NaiveDate,
        time: Option<&str>,
        cycle: Option<&CropCycle>,
    ) -> CalendarEvent {
        let now = Utc::now().fixed_offset();
        CalendarEvent {
            event: Event {
                id: Uuid::new_v4(),
                title: "Agrovet".to_string(),
                description: None,
                date,
                time: time.map(str::to_string),
                cycle_id: cycle.map(|c| c.id),
                crop: cycle.map(|c| c.crop.clone()),
                custom_crop: cycle.and_then(|c| c.custom_crop.clone()),
                plot_name: cycle.map(|c| c.plot_name.clone()),
                notes: None,
                created_at: now,
                updated_at: now,
            },
            farm_name: cycle.map(|c| c.farm_name.clone()),
        }
    }

    #[test]
    fn activities_are_merged_sorted_and_crops_without_a_table_counted() {
        let today = date(2026, 11, 19);
        let window = Window::resolve(None, None, today).unwrap();
        // `other` never has a table; an unknown slug is counted the same way.
        let sukuma = cycle("other", Some("Sukuma wiki"));
        let odd = cycle("not_a_crop", None);
        let day = date(2026, 11, 10);
        let weeding = activity(sukuma.id, "weeding", day);
        let planting = activity(odd.id, "planting", day);
        let earlier = activity(odd.id, "irrigation", date(2026, 11, 6));
        let outside = activity(sukuma.id, "harvest", date(2026, 11, 1)); // before `from`
        let stranger = activity(Uuid::new_v4(), "weeding", day); // not an open cycle here

        let cal = merge(
            window,
            today,
            &[sukuma.clone(), odd.clone()],
            vec![weeding.clone(), planting.clone(), earlier.clone(), outside, stranger],
            Vec::new(),
        );

        assert_eq!(cal.crops_without_calendar, 2);
        assert_eq!((cal.from, cal.to, cal.today), (window.from(), window.to(), today));
        let ids: Vec<_> = cal.entries.iter().map(|e| e.activity_id.unwrap()).collect();
        // Date first, then crop slug: `not_a_crop` sorts before `other`.
        assert_eq!(ids, [earlier.id, planting.id, weeding.id]);
        let first = &cal.entries[1];
        assert_eq!(first.key, "planting");
        assert_eq!((first.starts_on, first.ends_on), (day, day));
        assert_eq!(first.cycle_id, Some(odd.id));
        assert_eq!(
            (first.event_id, first.title.as_deref(), first.time.as_deref()),
            (None, None, None)
        );
        assert_eq!(first.cost_kes, Some(500));
        assert!(first.reviewed);
        assert_eq!(cal.entries[2].custom_crop.as_deref(), Some("Sukuma wiki"));
    }

    #[test]
    fn no_cycles_means_an_empty_calendar() {
        let today = date(2026, 11, 19);
        let window = Window::resolve(Some(today), Some(today + Days::new(1)), today).unwrap();
        let cal = merge(window, today, &[], Vec::new(), Vec::new());
        assert!(cal.entries.is_empty());
        assert_eq!(cal.crops_without_calendar, 0);
        assert_eq!(cal.time_zone, "Africa/Nairobi");
    }

    #[test]
    fn events_are_merged_with_or_without_a_crop_and_sorted_after_activities() {
        let today = date(2026, 11, 19);
        let window = Window::resolve(None, None, today).unwrap();
        let sukuma = cycle("other", Some("Sukuma wiki"));
        let day = date(2026, 11, 20);
        let weeding = activity(sukuma.id, "weeding", day);
        // Events: untimed with no crop, 14:00 linked, 07:30 with no crop,
        // one on an earlier day, one outside the window. A closed crop's
        // event arrives the same way (the query includes it), with its names.
        let untimed = event(day, None, None);
        let afternoon = event(day, Some("14:00"), Some(&sukuma));
        let morning = event(day, Some("07:30"), None);
        let earlier = event(date(2026, 11, 19), None, None);
        let outside = event(date(2027, 6, 1), Some("08:00"), None);

        let cal = merge(
            window,
            today,
            std::slice::from_ref(&sukuma),
            vec![weeding.clone()],
            vec![
                untimed.clone(),
                afternoon.clone(),
                morning.clone(),
                earlier.clone(),
                outside,
            ],
        );

        let order: Vec<_> = cal
            .entries
            .iter()
            .map(|e| (e.kind, e.activity_id.or(e.event_id)))
            .collect();
        assert_eq!(
            order,
            [
                (EntryKind::Event, Some(earlier.event.id)),
                (EntryKind::Activity, Some(weeding.id)),
                (EntryKind::Event, Some(morning.event.id)),
                (EntryKind::Event, Some(afternoon.event.id)),
                (EntryKind::Event, Some(untimed.event.id)),
            ]
        );

        let linked = &cal.entries[3];
        assert_eq!(linked.key, "event");
        assert_eq!((linked.starts_on, linked.ends_on), (day, day));
        assert_eq!(linked.cycle_id, Some(sukuma.id));
        assert_eq!(linked.crop.as_deref(), Some("other"));
        assert_eq!(linked.custom_crop.as_deref(), Some("Sukuma wiki"));
        assert_eq!(linked.plot_name.as_deref(), Some("Plot"));
        assert_eq!(linked.farm_name.as_deref(), Some("Farm"));
        assert_eq!(linked.title.as_deref(), Some("Agrovet"));
        assert_eq!(linked.time.as_deref(), Some("14:00"));
        assert_eq!((linked.activity_id, linked.cost_kes), (None, None));
        assert!(linked.reviewed);

        let bare = &cal.entries[4];
        assert_eq!(bare.event_id, Some(untimed.event.id));
        assert_eq!(
            (
                bare.cycle_id,
                bare.crop.as_deref(),
                bare.plot_name.as_deref(),
                bare.farm_name.as_deref()
            ),
            (None, None, None, None)
        );
        assert_eq!(bare.time, None);
        assert_eq!(cal.time_zone, "Africa/Nairobi");
    }

    #[test]
    fn events_show_even_without_any_open_crop() {
        let today = date(2026, 11, 19);
        let window = Window::resolve(None, None, today).unwrap();
        let only = event(today, Some("09:00"), None);
        let cal = merge(window, today, &[], Vec::new(), vec![only.clone()]);
        assert_eq!(cal.entries.len(), 1);
        assert_eq!(cal.entries[0].event_id, Some(only.event.id));
        assert_eq!(cal.crops_without_calendar, 0);
    }
}
