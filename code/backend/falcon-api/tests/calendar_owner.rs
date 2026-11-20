//! The whole-farm calendar against a real Postgres: owner-only, open crops
//! only, and the date window.
//!
//! Ignored by default because it needs a database. Run it against a
//! DISPOSABLE database (it applies the migrations and writes rows):
//!
//! ```sh
//! DATABASE_URL=postgres://… cargo test -p falcon-api --test calendar_owner -- --ignored
//! ```
//!
//! Same approach as `crop_owner.rs`: service layer, random owner ids for the
//! Clerk users, every row deleted at the end. Dates are relative to today in
//! Kenya, as the services use. The assertions do not depend on which crops
//! have a sourced table: they ask `falcon_core::calendar` the same question.

use std::collections::HashSet;

use chrono::{Days, NaiveDate};
use falcon_api::activity::model::ActivityInput;
use falcon_api::calendar::model::FarmCalendar;
use falcon_api::crop_cycle::model::{CropCycleInput, CropCyclePatch};
use falcon_api::db::entities::crop_cycles;
use falcon_api::error::AppError;
use falcon_api::farm::model::FarmInput;
use falcon_api::platform::clock::today_in_kenya;
use falcon_api::plot::model::PlotInput;
use falcon_api::state::{Services, services};
use falcon_core::calendar;
use falcon_core::crop::Crop;
use falcon_core::farm_calendar::EntryKind;
use migration::{Migrator, MigratorTrait};
use sea_orm::prelude::Uuid;
use sea_orm::{ColumnTrait, Database, EntityTrait, QueryFilter};

fn days_ago(days: u64) -> NaiveDate {
    today_in_kenya() - Days::new(days)
}

fn cycle_input(crop: &str, custom: Option<&str>, planted_on: NaiveDate) -> CropCycleInput {
    CropCycleInput {
        crop: crop.to_string(),
        custom_crop: custom.map(str::to_string),
        variety: None,
        planted_on,
    }
}

fn activity_input(kind: &str, done_on: NaiveDate, cost_kes: Option<i64>) -> ActivityInput {
    ActivityInput {
        kind: kind.to_string(),
        done_on,
        input: None,
        quantity: None,
        quantity_unit: None,
        cost_kes,
        notes: None,
    }
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

/// The activity ids of a calendar, in order.
fn activity_ids(cal: &FarmCalendar) -> Vec<Uuid> {
    cal.entries
        .iter()
        .filter(|e| e.kind == EntryKind::Activity)
        .map(|e| e.activity_id.unwrap())
        .collect()
}

/// Checks what holds for any calendar: every crop entry is inside the
/// window and on one of `cycles`, entries are sorted by date, table entries
/// carry no activity or event fields, and the time zone is Kenya's. (This
/// test adds no events; `event_owner.rs` covers them.)
fn assert_well_formed(cal: &FarmCalendar, cycles: &HashSet<Uuid>) {
    assert_eq!(cal.time_zone, "Africa/Nairobi");
    for e in &cal.entries {
        assert!(e.starts_on <= cal.to && e.ends_on >= cal.from, "outside window: {e:?}");
        match e.kind {
            EntryKind::Activity => {
                assert!(cycles.contains(&e.cycle_id.unwrap()), "foreign cycle {e:?}");
                assert!(e.activity_id.is_some());
                assert_eq!(e.starts_on, e.ends_on);
                assert!(e.reviewed);
            }
            EntryKind::Stage | EntryKind::Task => {
                assert!(cycles.contains(&e.cycle_id.unwrap()), "foreign cycle {e:?}");
                assert_eq!(e.activity_id, None);
                assert_eq!(e.cost_kes, None);
                assert_eq!((e.event_id, e.title.as_ref(), e.time.as_ref()), (None, None, None));
            }
            EntryKind::Event => panic!("no events were added: {e:?}"),
        }
    }
    assert!(cal.entries.windows(2).all(|p| p[0].starts_on <= p[1].starts_on));
}

/// How many of these (crop, planting date) pairs have no sourced table.
fn without_table(cycles: &[(&str, NaiveDate)]) -> u64 {
    let today = today_in_kenya();
    let count = cycles
        .iter()
        .filter(|(crop, planted)| {
            Crop::from_slug(crop)
                .and_then(|c| calendar::for_crop(c, *planted, today))
                .is_none()
        })
        .count();
    u64::try_from(count).unwrap()
}

#[tokio::test]
#[ignore = "needs DATABASE_URL pointing at a disposable Postgres"]
async fn farm_calendar_is_owner_only_and_windowed() {
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = Database::connect(url.as_str()).await.unwrap();
    Migrator::up(&db, None).await.unwrap();
    let s = services(&db);
    let today = today_in_kenya();

    let alice = format!("user_test_{}", Uuid::new_v4().simple());
    let bob = format!("user_test_{}", Uuid::new_v4().simple());
    let carol = format!("user_test_{}", Uuid::new_v4().simple());

    // ---- Alice: maize (active), sukuma wiki (planned), beans (harvested).
    let (alice_farm, alice_plots) =
        farm_with_plots(&s, &alice, &["Plot A", "Plot B", "Plot C"]).await;
    let maize_planted = days_ago(10);
    let maize = s
        .crop_cycles
        .create(&alice, alice_plots[0], &cycle_input("maize", None, maize_planted))
        .await
        .unwrap();
    let tomorrow = today + Days::new(1);
    let sukuma = s
        .crop_cycles
        .create(&alice, alice_plots[1], &cycle_input("other", Some("Sukuma wiki"), tomorrow))
        .await
        .unwrap();
    assert_eq!(sukuma.status, "planned");
    let beans = s
        .crop_cycles
        .create(&alice, alice_plots[2], &cycle_input("beans", None, days_ago(30)))
        .await
        .unwrap();

    let weeding = s
        .activities
        .create(&alice, maize.id, &activity_input("weeding", days_ago(5), Some(300)))
        .await
        .unwrap();
    let prep = s
        .activities
        .create(&alice, maize.id, &activity_input("land_preparation", days_ago(20), Some(1_000)))
        .await
        .unwrap();
    let beans_harvest = s
        .activities
        .create(&alice, beans.id, &activity_input("harvest", days_ago(3), None))
        .await
        .unwrap();
    let harvested = CropCyclePatch {
        status: Some("harvested".to_string()),
        ..CropCyclePatch::default()
    };
    s.crop_cycles.update(&alice, beans.id, &harvested).await.unwrap();

    // ---- Bob: his own maize and weeding, on the same days as Alice's.
    let (bob_farm, bob_plots) = farm_with_plots(&s, &bob, &["Bob's plot"]).await;
    let bob_maize = s
        .crop_cycles
        .create(&bob, bob_plots[0], &cycle_input("maize", None, maize_planted))
        .await
        .unwrap();
    let bob_weeding = s
        .activities
        .create(&bob, bob_maize.id, &activity_input("weeding", days_ago(5), Some(1)))
        .await
        .unwrap();

    // ---- Alice, default window: 14 days ago to 60 days ahead. ---------------
    let alice_open: HashSet<Uuid> = [maize.id, sukuma.id].into_iter().collect();
    let cal = s.calendar.farm(&alice, None, None).await.unwrap();
    assert_eq!(cal.today, today);
    assert_eq!(cal.from, today - Days::new(14));
    assert_eq!(cal.to, today + Days::new(60));
    assert_well_formed(&cal, &alice_open);
    // Only the weeding: land preparation is before the window, the beans are
    // harvested (closed), and Bob's weeding is Bob's.
    assert_eq!(activity_ids(&cal), [weeding.id]);
    let entry = cal
        .entries
        .iter()
        .find(|e| e.activity_id == Some(weeding.id))
        .unwrap();
    assert_eq!(entry.key, "weeding");
    assert_eq!(entry.cost_kes, Some(300));
    assert_eq!(entry.crop.as_deref(), Some("maize"));
    assert_eq!(entry.plot_name.as_deref(), Some("Plot A"));
    assert_eq!(entry.farm_name.as_deref(), Some("Shamba"));
    assert!(cal.entries.iter().all(|e| e.cycle_id != Some(beans.id)));
    assert!(cal.entries.iter().all(|e| e.cycle_id != Some(bob_maize.id)));
    assert!(!activity_ids(&cal).contains(&beans_harvest.id));
    // `other` never has a table; maize counts only if its table is missing.
    assert_eq!(
        cal.crops_without_calendar,
        without_table(&[("maize", maize_planted), ("other", tomorrow)])
    );
    // Table entries, if any, belong to the maize (the only crop that can have one).
    assert!(
        cal.entries
            .iter()
            .filter(|e| e.kind != EntryKind::Activity)
            .all(|e| e.cycle_id == Some(maize.id) && e.crop.as_deref() == Some("maize"))
    );

    // ---- Alice, an explicit past window: only the land preparation. -------
    let cal = s
        .calendar
        .farm(&alice, Some(days_ago(25)), Some(days_ago(15)))
        .await
        .unwrap();
    assert_eq!((cal.from, cal.to), (days_ago(25), days_ago(15)));
    assert_well_formed(&cal, &alice_open);
    assert_eq!(activity_ids(&cal), [prep.id]);

    // A one-day window on the weeding day; both ends are included.
    let cal = s
        .calendar
        .farm(&alice, Some(days_ago(5)), Some(days_ago(5)))
        .await
        .unwrap();
    assert_eq!(activity_ids(&cal), [weeding.id]);

    // ---- Bad windows are refused before any query (400). ------------------
    assert!(matches!(
        s.calendar.farm(&alice, Some(today), Some(days_ago(1))).await,
        Err(AppError::Validation(_))
    ));
    assert!(matches!(
        s.calendar
            .farm(&alice, Some(days_ago(181)), Some(today))
            .await,
        Err(AppError::Validation(_))
    ));
    assert!(
        s.calendar
            .farm(&alice, Some(days_ago(180)), Some(today))
            .await
            .is_ok()
    );

    // ---- Bob sees only his own. -------------------------------------------
    let bob_open: HashSet<Uuid> = [bob_maize.id].into_iter().collect();
    let cal = s.calendar.farm(&bob, None, None).await.unwrap();
    assert_well_formed(&cal, &bob_open);
    assert_eq!(activity_ids(&cal), [bob_weeding.id]);
    assert_eq!(cal.crops_without_calendar, without_table(&[("maize", maize_planted)]));

    // ---- Someone with no farm gets an empty calendar. ---------------------
    let cal = s.calendar.farm(&carol, None, None).await.unwrap();
    assert!(cal.entries.is_empty());
    assert_eq!(cal.crops_without_calendar, 0);

    // ---- Clean up: cycles directly (their activities cascade), then plots
    // and farms through the API.
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
