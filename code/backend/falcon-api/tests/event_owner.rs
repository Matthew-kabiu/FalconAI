//! Calendar events against a real Postgres: owner-only reads and writes,
//! crop links only to the caller's own cycles, PATCH null-clearing, and the
//! events on the whole-farm calendar.
//!
//! Ignored by default because it needs a database. Run it against a
//! DISPOSABLE database (it applies the migrations and writes rows):
//!
//! ```sh
//! DATABASE_URL=postgres://… cargo test -p falcon-api --test event_owner -- --ignored
//! ```
//!
//! Same approach as `calendar_owner.rs`: service layer, random owner ids for
//! the Clerk users, every row deleted at the end. Dates are relative to
//! today in Kenya, as the services use.

use chrono::{Days, NaiveDate};
use falcon_api::calendar::model::FarmCalendar;
use falcon_api::crop_cycle::model::{CropCycleInput, CropCyclePatch};
use falcon_api::db::entities::{crop_cycles, events};
use falcon_api::error::AppError;
use falcon_api::event::model::{EventInput, EventPatch};
use falcon_api::farm::model::FarmInput;
use falcon_api::platform::clock::today_in_kenya;
use falcon_api::plot::model::PlotInput;
use falcon_api::state::{Services, services};
use falcon_core::CoreError;
use falcon_core::farm_calendar::EntryKind;
use migration::{Migrator, MigratorTrait};
use sea_orm::prelude::Uuid;
use sea_orm::{ActiveModelTrait, ColumnTrait, Database, EntityTrait, QueryFilter, Set};

fn days_ahead(days: u64) -> NaiveDate {
    today_in_kenya() + Days::new(days)
}

fn cycle_input(crop: &str, planted_on: NaiveDate) -> CropCycleInput {
    CropCycleInput {
        crop: crop.to_string(),
        custom_crop: None,
        variety: None,
        planted_on,
    }
}

fn event_input(title: &str, date: NaiveDate, time: Option<&str>, cycle: Option<Uuid>) -> EventInput {
    EventInput {
        title: title.to_string(),
        description: Some(" seed for the long rains ".to_string()),
        date,
        time: time.map(str::to_string),
        cycle_id: cycle,
        notes: Some(" bring the receipt ".to_string()),
    }
}

fn not_found<T: std::fmt::Debug>(result: Result<T, AppError>) -> bool {
    matches!(result, Err(AppError::NotFound(_)))
}

fn rule_broken<T: std::fmt::Debug>(result: Result<T, AppError>) -> bool {
    matches!(result, Err(AppError::Domain(CoreError::Fields(_))))
}

/// A farm with one plot per name, owned by `owner`: (farm id, plot ids).
async fn farm_with_plots(s: &Services, owner: &str, plots: &[&str]) -> (Uuid, Vec<Uuid>) {
    let farm = s
        .farms
        .create(
            owner,
            &FarmInput {
                name: "Shamba".to_string(),
                county: "nakuru".to_string(),
                locality: None,
            },
        )
        .await
        .unwrap();
    let mut ids = Vec::new();
    for name in plots {
        let plot = s
            .plots
            .create(
                owner,
                farm.id,
                &PlotInput {
                    name: (*name).to_string(),
                    size: 1.0,
                    size_unit: "acres".to_string(),
                    notes: None,
                },
            )
            .await
            .unwrap();
        ids.push(plot.id);
    }
    (farm.id, ids)
}

/// The event ids of a calendar, in order.
fn event_ids(cal: &FarmCalendar) -> Vec<Uuid> {
    cal.entries
        .iter()
        .filter(|e| e.kind == EntryKind::Event)
        .map(|e| e.event_id.unwrap())
        .collect()
}

#[tokio::test]
#[ignore = "needs DATABASE_URL pointing at a disposable Postgres"]
async fn events_are_owner_only_and_on_the_farm_calendar() {
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = Database::connect(url.as_str()).await.unwrap();
    Migrator::up(&db, None).await.unwrap();
    let s = services(&db);
    let today = today_in_kenya();

    let alice = format!("user_test_{}", Uuid::new_v4().simple());
    let bob = format!("user_test_{}", Uuid::new_v4().simple());

    // ---- Alice: maize (active) and beans (harvested later). Bob: maize. ----
    let (alice_farm, alice_plots) = farm_with_plots(&s, &alice, &["Plot A", "Plot B"]).await;
    let maize = s
        .crop_cycles
        .create(&alice, alice_plots[0], &cycle_input("maize", today - Days::new(10)))
        .await
        .unwrap();
    let beans = s
        .crop_cycles
        .create(&alice, alice_plots[1], &cycle_input("beans", today - Days::new(30)))
        .await
        .unwrap();
    let (bob_farm, bob_plots) = farm_with_plots(&s, &bob, &["Bob's plot"]).await;
    let bob_maize = s
        .crop_cycles
        .create(&bob, bob_plots[0], &cycle_input("maize", today - Days::new(10)))
        .await
        .unwrap();

    // ---- Create. ----------------------------------------------------------
    let bare = s
        .events
        .create(&alice, &event_input("  Agrovet  ", today, None, None))
        .await
        .unwrap();
    assert_eq!(bare.title, "Agrovet");
    assert_eq!(bare.date, today);
    assert_eq!(bare.description.as_deref(), Some("seed for the long rains"));
    assert_eq!(bare.notes.as_deref(), Some("bring the receipt"));
    assert_eq!(
        (bare.cycle_id, bare.crop.as_deref(), bare.plot_name.as_deref(), bare.time.as_deref()),
        (None, None, None, None)
    );

    let linked = s
        .events
        .create(&alice, &event_input("Top dressing", days_ahead(1), Some("09:30"), Some(maize.id)))
        .await
        .unwrap();
    assert_eq!(linked.cycle_id, Some(maize.id));
    assert_eq!(linked.crop.as_deref(), Some("maize"));
    assert_eq!(linked.plot_name.as_deref(), Some("Plot A"));
    assert_eq!(linked.time.as_deref(), Some("09:30"));

    let on_beans = s
        .events
        .create(&alice, &event_input("Sell beans", days_ahead(2), None, Some(beans.id)))
        .await
        .unwrap();

    // Linking to someone else's cycle, or one that does not exist: 404.
    assert!(not_found(
        s.events
            .create(&alice, &event_input("Sneaky", today, None, Some(bob_maize.id)))
            .await
    ));
    assert!(not_found(
        s.events
            .create(&alice, &event_input("Ghost", today, None, Some(Uuid::new_v4())))
            .await
    ));
    // Rules are checked: a past date or a bad time is a 422.
    assert!(rule_broken(
        s.events
            .create(&alice, &event_input("Late", today - Days::new(1), None, None))
            .await
    ));
    assert!(rule_broken(
        s.events
            .create(&alice, &event_input("Bad time", today, Some("24:00"), None))
            .await
    ));

    let bobs = s
        .events
        .create(&bob, &event_input("Bob's day", today, Some("08:00"), Some(bob_maize.id)))
        .await
        .unwrap();

    // ---- Read: own only. ---------------------------------------------------
    assert_eq!(s.events.get(&alice, linked.id).await.unwrap(), linked);
    assert!(not_found(s.events.get(&bob, linked.id).await));
    assert!(not_found(s.events.get(&alice, bobs.id).await));
    assert!(not_found(s.events.get(&alice, Uuid::new_v4()).await));

    // ---- Someone else cannot change or delete it. -------------------------
    let rename = EventPatch {
        title: Some("Bob was here".to_string()),
        ..EventPatch::default()
    };
    assert!(not_found(s.events.update(&bob, linked.id, &rename).await));
    assert!(not_found(s.events.delete(&bob, linked.id).await));
    assert!(not_found(s.events.update(&alice, bobs.id, &rename).await));
    assert!(not_found(s.events.delete(&alice, bobs.id).await));
    assert_eq!(s.events.get(&alice, linked.id).await.unwrap(), linked);
    assert_eq!(s.events.get(&bob, bobs.id).await.unwrap(), bobs);

    // Re-linking to Bob's cycle is a 404 and changes nothing.
    let relink = EventPatch {
        cycle_id: Some(Some(bob_maize.id)),
        title: Some("Changed".to_string()),
        ..EventPatch::default()
    };
    assert!(not_found(s.events.update(&alice, linked.id, &relink).await));
    assert_eq!(s.events.get(&alice, linked.id).await.unwrap(), linked);

    // ---- PATCH: only sent fields change; null clears. ---------------------
    let move_to_beans = EventPatch {
        cycle_id: Some(Some(beans.id)),
        ..EventPatch::default()
    };
    let moved = s.events.update(&alice, linked.id, &move_to_beans).await.unwrap();
    assert_eq!(moved.cycle_id, Some(beans.id));
    assert_eq!(moved.crop.as_deref(), Some("beans"));
    assert_eq!(moved.plot_name.as_deref(), Some("Plot B"));
    assert_eq!((moved.title.as_str(), moved.time.as_deref()), ("Top dressing", Some("09:30")));

    // Description not sent: unchanged.
    assert_eq!(moved.description.as_deref(), Some("seed for the long rains"));

    let clear = EventPatch {
        description: Some(None),
        time: Some(None),
        cycle_id: Some(None),
        notes: Some(None),
        ..EventPatch::default()
    };
    let cleared = s.events.update(&alice, linked.id, &clear).await.unwrap();
    assert_eq!(
        (cleared.time.as_deref(), cleared.cycle_id, cleared.crop.as_deref(), cleared.notes.as_deref()),
        (None, None, None, None)
    );
    assert_eq!(cleared.description, None);
    assert_eq!((cleared.title.as_str(), cleared.date), ("Top dressing", days_ahead(1)));
    assert!(cleared.updated_at >= linked.updated_at);

    let back = EventPatch {
        cycle_id: Some(Some(maize.id)),
        time: Some(Some("16:45".to_string())),
        description: Some(Some("  CAN fertiliser  ".to_string())),
        ..EventPatch::default()
    };
    let linked = s.events.update(&alice, linked.id, &back).await.unwrap();
    assert_eq!((linked.cycle_id, linked.time.as_deref()), (Some(maize.id), Some("16:45")));
    assert_eq!(linked.description.as_deref(), Some("CAN fertiliser"));

    // A sent date must be today or later; a past event's other fields can
    // still be edited when the date is not sent.
    let to_past = EventPatch {
        date: Some(today - Days::new(1)),
        ..EventPatch::default()
    };
    assert!(rule_broken(s.events.update(&alice, linked.id, &to_past).await));
    let past_id = Uuid::new_v4();
    events::ActiveModel {
        id: Set(past_id),
        owner_id: Set(alice.clone()),
        cycle_id: Set(None),
        title: Set("Planted maize".to_string()),
        date: Set(today - Days::new(3)),
        time: Set(None),
        notes: Set(None),
        description: Set(None),
        ..Default::default()
    }
    .insert(&db)
    .await
    .unwrap();
    let past = s.events.update(&alice, past_id, &rename).await.unwrap();
    assert_eq!((past.title.as_str(), past.date), ("Bob was here", today - Days::new(3)));

    // ---- The farm calendar shows each farmer's own events only. -----------
    // Beans harvested: its event still shows, with the crop's names.
    let harvested = CropCyclePatch {
        status: Some("harvested".to_string()),
        ..CropCyclePatch::default()
    };
    s.crop_cycles.update(&alice, beans.id, &harvested).await.unwrap();

    let cal = s.calendar.farm(&alice, None, None).await.unwrap();
    assert_eq!(cal.time_zone, "Africa/Nairobi");
    // Sorted by date: past (3 days ago), bare (today), linked (+1), beans (+2).
    assert_eq!(event_ids(&cal), [past_id, bare.id, linked.id, on_beans.id]);
    assert!(!event_ids(&cal).contains(&bobs.id));
    assert!(cal.entries.iter().all(|e| e.cycle_id != Some(bob_maize.id)));
    let entry = |id: Uuid| cal.entries.iter().find(|e| e.event_id == Some(id)).unwrap();
    let e = entry(linked.id);
    assert_eq!((e.key.as_str(), e.starts_on, e.ends_on), ("event", days_ahead(1), days_ahead(1)));
    assert_eq!(e.title.as_deref(), Some("Top dressing"));
    assert_eq!(e.time.as_deref(), Some("16:45"));
    assert_eq!(e.crop.as_deref(), Some("maize"));
    assert_eq!(e.plot_name.as_deref(), Some("Plot A"));
    assert_eq!(e.farm_name.as_deref(), Some("Shamba"));
    assert_eq!((e.activity_id, e.cost_kes), (None, None));
    assert!(e.reviewed);
    let e = entry(on_beans.id);
    assert_eq!(e.cycle_id, Some(beans.id));
    assert_eq!(e.crop.as_deref(), Some("beans"));
    let e = entry(bare.id);
    assert_eq!((e.cycle_id, e.crop.as_deref(), e.farm_name.as_deref()), (None, None, None));

    // A window that excludes them all.
    let cal = s
        .calendar
        .farm(&alice, Some(days_ahead(10)), Some(days_ahead(20)))
        .await
        .unwrap();
    assert!(event_ids(&cal).is_empty());

    let cal = s.calendar.farm(&bob, None, None).await.unwrap();
    assert_eq!(event_ids(&cal), [bobs.id]);
    assert!(cal.entries.iter().all(|e| e.cycle_id.is_none_or(|c| c == bob_maize.id)));

    // ---- Delete: own only, then gone. --------------------------------------
    s.events.delete(&alice, bare.id).await.unwrap();
    assert!(not_found(s.events.get(&alice, bare.id).await));
    assert!(not_found(s.events.delete(&alice, bare.id).await));

    // ---- Clean up: events, then cycles directly, then plots and farms. -----
    for id in [linked.id, on_beans.id, past_id] {
        s.events.delete(&alice, id).await.unwrap();
    }
    s.events.delete(&bob, bobs.id).await.unwrap();
    for (owner, farm, plots) in [(&alice, alice_farm, &alice_plots), (&bob, bob_farm, &bob_plots)] {
        crop_cycles::Entity::delete_many()
            .filter(crop_cycles::Column::PlotId.is_in(plots.iter().copied()))
            .exec(&db)
            .await
            .unwrap();
        for plot in plots {
            s.plots.delete(owner, *plot).await.unwrap();
        }
        s.farms.delete(owner, farm).await.unwrap();
    }
}
