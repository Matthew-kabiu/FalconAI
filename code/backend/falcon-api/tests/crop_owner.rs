//! Owner-only access and the 409 rules for crop cycles and activities,
//! against a real Postgres.
//!
//! Ignored by default because it needs a database. Run it against a
//! DISPOSABLE database (it applies the migrations and writes rows):
//!
//! ```sh
//! DATABASE_URL=postgres://… cargo test -p falcon-api --test crop_owner -- --ignored
//! ```
//!
//! Same approach as `farm_owner.rs`: service layer, two random owner ids for
//! two Clerk users, every row deleted at the end. Dates are relative to
//! today in Kenya, as the services use.

use chrono::{Days, NaiveDate};
use falcon_api::activity::model::{ActivityInput, ActivityPatch};
use falcon_api::crop_cycle::model::{CropCycleInput, CropCyclePatch, StatusFilter};
use falcon_api::db::entities::crop_cycles;
use falcon_api::error::AppError;
use falcon_api::farm::model::FarmInput;
use falcon_api::platform::clock::today_in_kenya;
use falcon_api::plot::model::PlotInput;
use falcon_api::state::services;
use falcon_core::CoreError;
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
        variety: Some(" H614 ".to_string()),
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

fn not_found<T: std::fmt::Debug>(result: Result<T, AppError>) -> bool {
    matches!(result, Err(AppError::NotFound(_)))
}

#[tokio::test]
#[ignore = "needs DATABASE_URL pointing at a disposable Postgres"]
async fn crop_cycles_and_activities_are_owner_only() {
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = Database::connect(url.as_str()).await.unwrap();
    Migrator::up(&db, None).await.unwrap();
    let s = services(&db);

    let alice = format!("user_test_{}", Uuid::new_v4().simple());
    let bob = format!("user_test_{}", Uuid::new_v4().simple());

    let farm = s
        .farms
        .create(
            &alice,
            &FarmInput {
                name: "Shamba".to_string(),
                county: "nakuru".to_string(),
                locality: None,
            },
        )
        .await
        .unwrap();
    let plot = s
        .plots
        .create(
            &alice,
            farm.id,
            &PlotInput {
                name: "Plot A".to_string(),
                size: 1.0,
                size_unit: "acres".to_string(),
                notes: None,
            },
        )
        .await
        .unwrap();

    // ---- Alice starts maize, planted 10 days ago: active. -----------------
    let cycle = s
        .crop_cycles
        .create(&alice, plot.id, &cycle_input("maize", None, days_ago(10)))
        .await
        .unwrap();
    assert_eq!(cycle.status, "active");
    assert_eq!(cycle.crop, "maize");
    assert_eq!(cycle.variety.as_deref(), Some("H614"));
    assert_eq!(cycle.plot_id, plot.id);
    assert_eq!(cycle.farm_id, farm.id);
    assert_eq!(cycle.plot_name, "Plot A");
    assert_eq!(cycle.farm_name, "Shamba");

    // ---- One open cycle per plot: 409 OPEN_CYCLE_EXISTS. ------------------
    assert!(matches!(
        s.crop_cycles
            .create(&alice, plot.id, &cycle_input("beans", None, days_ago(1)))
            .await,
        Err(AppError::Domain(CoreError::OpenCycleExists))
    ));

    // ---- Bob sees and touches nothing of Alice's: always 404. -------------
    assert!(not_found(s.crop_cycles.list_for_plot(&bob, plot.id).await));
    assert!(not_found(
        s.crop_cycles
            .create(&bob, plot.id, &cycle_input("beans", None, days_ago(1)))
            .await
    ));
    assert!(not_found(s.crop_cycles.get(&bob, cycle.id).await));
    let harvest = CropCyclePatch {
        status: Some("harvested".to_string()),
        ..CropCyclePatch::default()
    };
    assert!(not_found(s.crop_cycles.update(&bob, cycle.id, &harvest).await));
    let (list, total) = s.crop_cycles.list(&bob, None, 0, 20).await.unwrap();
    assert!(list.is_empty());
    assert_eq!(total, 0);
    assert!(not_found(s.activities.list(&bob, cycle.id, 0, 20).await));
    assert!(not_found(
        s.activities
            .create(&bob, cycle.id, &activity_input("weeding", days_ago(1), Some(1)))
            .await
    ));

    // ---- Activities and the season total. ---------------------------------
    let prep = s
        .activities
        .create(
            &alice,
            cycle.id,
            &activity_input("land_preparation", days_ago(20), Some(1_500)),
        )
        .await
        .unwrap();
    let mut fertiliser = activity_input("fertiliser", days_ago(5), Some(2_500));
    fertiliser.input = Some(" DAP ".to_string());
    fertiliser.quantity = Some(1.5);
    fertiliser.quantity_unit = Some("bags".to_string());
    let fertiliser = s
        .activities
        .create(&alice, cycle.id, &fertiliser)
        .await
        .unwrap();
    assert_eq!(fertiliser.input.as_deref(), Some("DAP"));
    assert_eq!(fertiliser.quantity, Some(1.5));
    assert_eq!(fertiliser.quantity_unit.as_deref(), Some("bags"));
    // No cost: counts as 0 in the total.
    let weeding = s
        .activities
        .create(&alice, cycle.id, &activity_input("weeding", days_ago(2), None))
        .await
        .unwrap();

    // doneOn in the future is refused (422).
    assert!(matches!(
        s.activities
            .create(
                &alice,
                cycle.id,
                &activity_input("weeding", today_in_kenya() + Days::new(1), None)
            )
            .await,
        Err(AppError::Domain(CoreError::Fields(_)))
    ));

    // Newest first, paged, with the total over every page.
    let page = s.activities.list(&alice, cycle.id, 0, 2).await.unwrap();
    assert_eq!(page.total, 3);
    assert_eq!(page.total_cost_kes, 4_000);
    let ids: Vec<Uuid> = page.activities.iter().map(|a| a.id).collect();
    assert_eq!(ids, [weeding.id, fertiliser.id]);
    let page_2 = s.activities.list(&alice, cycle.id, 2, 2).await.unwrap();
    assert_eq!(page_2.activities.len(), 1);
    assert_eq!(page_2.activities[0].id, prep.id);
    assert_eq!(page_2.total_cost_kes, 4_000);

    let detail = s.crop_cycles.get(&alice, cycle.id).await.unwrap();
    assert_eq!(detail.season_cost_kes, 4_000);
    assert_eq!(detail.activity_count, 3);
    assert!(detail.calendar.is_some()); // maize has a sourced table
    assert_eq!(detail.cycle.plot_name, "Plot A");

    // Bob cannot change or delete Alice's activities.
    let recost = ActivityPatch {
        cost_kes: Some(Some(1)),
        ..ActivityPatch::default()
    };
    assert!(not_found(s.activities.update(&bob, prep.id, &recost).await));
    assert!(not_found(s.activities.delete(&bob, prep.id).await));

    // Alice edits: clearing the quantity alone would leave a unit behind (422);
    // clearing both works; a cost change moves the season total.
    let clear_quantity = ActivityPatch {
        quantity: Some(None),
        ..ActivityPatch::default()
    };
    assert!(matches!(
        s.activities.update(&alice, fertiliser.id, &clear_quantity).await,
        Err(AppError::Domain(CoreError::Fields(_)))
    ));
    let clear_both = ActivityPatch {
        quantity: Some(None),
        quantity_unit: Some(None),
        cost_kes: Some(Some(3_000)),
        ..ActivityPatch::default()
    };
    let updated = s
        .activities
        .update(&alice, fertiliser.id, &clear_both)
        .await
        .unwrap();
    assert_eq!(updated.quantity, None);
    assert_eq!(updated.quantity_unit, None);
    assert_eq!(updated.cost_kes, Some(3_000));
    let detail = s.crop_cycles.get(&alice, cycle.id).await.unwrap();
    assert_eq!(detail.season_cost_kes, 4_500);

    s.activities.delete(&alice, weeding.id).await.unwrap();
    assert_eq!(
        s.crop_cycles.get(&alice, cycle.id).await.unwrap().activity_count,
        2
    );

    // ---- Status moves only forward: 409 STATUS_BACKWARDS. -----------------
    let back_to_planned = CropCyclePatch {
        status: Some("planned".to_string()),
        ..CropCyclePatch::default()
    };
    assert!(matches!(
        s.crop_cycles.update(&alice, cycle.id, &back_to_planned).await,
        Err(AppError::Domain(CoreError::StatusBackwards))
    ));
    let harvested = s
        .crop_cycles
        .update(&alice, cycle.id, &harvest)
        .await
        .unwrap();
    assert_eq!(harvested.status, "harvested");
    let reopen = CropCyclePatch {
        status: Some("active".to_string()),
        ..CropCyclePatch::default()
    };
    assert!(matches!(
        s.crop_cycles.update(&alice, cycle.id, &reopen).await,
        Err(AppError::Domain(CoreError::StatusBackwards))
    ));

    // ---- The plot is free again: an `other` crop planted tomorrow is planned.
    let tomorrow = today_in_kenya() + Days::new(1);
    let next = s
        .crop_cycles
        .create(&alice, plot.id, &cycle_input("other", Some(" Sukuma wiki "), tomorrow))
        .await
        .unwrap();
    assert_eq!(next.status, "planned");
    assert_eq!(next.custom_crop.as_deref(), Some("Sukuma wiki"));
    assert_eq!(s.crop_cycles.get(&alice, next.id).await.unwrap().calendar, None);

    let (open, total) = s
        .crop_cycles
        .list(&alice, Some(StatusFilter::Open), 0, 20)
        .await
        .unwrap();
    assert_eq!((open.len(), total), (1, 1));
    assert_eq!(open[0].id, next.id);
    let (closed, _) = s
        .crop_cycles
        .list(&alice, Some(StatusFilter::Closed), 0, 20)
        .await
        .unwrap();
    assert_eq!(closed.len(), 1);
    assert_eq!(closed[0].id, cycle.id);
    // Newest planting first.
    let all = s.crop_cycles.list_for_plot(&alice, plot.id).await.unwrap();
    let ids: Vec<Uuid> = all.iter().map(|c| c.id).collect();
    assert_eq!(ids, [next.id, cycle.id]);

    // ---- A plot with crop cycles cannot be deleted: 409 PLOT_HAS_CROPS. ---
    assert!(matches!(
        s.plots.delete(&alice, plot.id).await,
        Err(AppError::Domain(CoreError::PlotHasCrops))
    ));

    // ---- Clean up. The API cannot delete cycles yet, so the test deletes
    // them directly (their activities cascade), then the plot and farm.
    crop_cycles::Entity::delete_many()
        .filter(crop_cycles::Column::PlotId.eq(plot.id))
        .exec(&db)
        .await
        .unwrap();
    s.plots.delete(&alice, plot.id).await.unwrap();
    s.farms.delete(&alice, farm.id).await.unwrap();
    assert!(not_found(s.crop_cycles.get(&alice, cycle.id).await));
}
