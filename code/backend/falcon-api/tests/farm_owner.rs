//! Owner-only access for farms and plots, against a real Postgres.
//!
//! Ignored by default because it needs a database. Run it against a
//! DISPOSABLE database (it applies the migrations and writes rows):
//!
//! ```sh
//! DATABASE_URL=postgres://… cargo test -p falcon-api --test farm_owner -- --ignored
//! ```
//!
//! It works at the service layer (no tokens needed): two random owner ids
//! stand in for two Clerk users. Every row it creates is deleted at the end.
//! Uses only what the workspace already has (tokio, sea-orm, migration);
//! a self-starting Postgres (`testcontainers`) would need a new dev-dependency.

use falcon_api::error::AppError;
use falcon_api::farm::model::{FarmInput, FarmPatch};
use falcon_api::plot::model::{PlotInput, PlotPatch};
use falcon_api::state::services;
use falcon_core::CoreError;
use migration::{Migrator, MigratorTrait};
use sea_orm::Database;
use sea_orm::prelude::Uuid;

fn farm_input(name: &str) -> FarmInput {
    FarmInput {
        name: name.to_string(),
        county: "kiambu".to_string(),
        locality: Some(" Gatundu ".to_string()),
    }
}

fn plot_input(name: &str) -> PlotInput {
    PlotInput {
        name: name.to_string(),
        size: 0.5,
        size_unit: "acres".to_string(),
        notes: None,
    }
}

#[tokio::test]
#[ignore = "needs DATABASE_URL pointing at a disposable Postgres"]
async fn farms_and_plots_are_owner_only() {
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let db = Database::connect(url.as_str()).await.unwrap();
    Migrator::up(&db, None).await.unwrap();
    let services = services(&db);
    let (farms, plots) = (services.farms, services.plots);

    // Random owner ids, so repeated runs never see each other's rows.
    let alice = format!("user_test_{}", Uuid::new_v4().simple());
    let bob = format!("user_test_{}", Uuid::new_v4().simple());

    let farm = farms.create(&alice, &farm_input(" Home farm ")).await.unwrap();
    assert_eq!(farm.name, "Home farm");
    assert_eq!(farm.county, "kiambu");
    assert_eq!(farm.locality.as_deref(), Some("Gatundu"));
    assert_eq!(farm.plot_count, 0);

    // Bob sees and touches nothing of Alice's: always 404, never 403.
    let (list, total) = farms.list(&bob, 0, 20).await.unwrap();
    assert!(list.is_empty());
    assert_eq!(total, 0);
    assert!(matches!(
        farms.get(&bob, farm.id).await,
        Err(AppError::NotFound(_))
    ));
    let rename = FarmPatch {
        name: Some("Mine now".to_string()),
        ..FarmPatch::default()
    };
    assert!(matches!(
        farms.update(&bob, farm.id, &rename).await,
        Err(AppError::NotFound(_))
    ));
    assert!(matches!(
        farms.delete(&bob, farm.id).await,
        Err(AppError::NotFound(_))
    ));
    assert!(matches!(
        plots.create(&bob, farm.id, &plot_input("Sneaky")).await,
        Err(AppError::NotFound(_))
    ));

    // Alice adds two plots; the farm detail lists them sorted by name.
    let plot_a = plots
        .create(&alice, farm.id, &plot_input("Plot A"))
        .await
        .unwrap();
    let plot_b = plots.create(&alice, farm.id, &plot_input("B")).await.unwrap();
    assert!((plot_a.size - 0.5).abs() < 1e-9);
    assert_eq!(plot_a.size_unit, "acres");
    assert_eq!(plot_a.farm_id, farm.id);

    let detail = farms.get(&alice, farm.id).await.unwrap();
    assert_eq!(detail.farm.plot_count, 2);
    let names: Vec<&str> = detail.plots.iter().map(|p| p.name.as_str()).collect();
    assert_eq!(names, ["B", "Plot A"]);

    // The list counts plots in the database too.
    let (list, total) = farms.list(&alice, 0, 20).await.unwrap();
    assert_eq!(total, 1);
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].plot_count, 2);

    // Bob cannot change or delete Alice's plots.
    let resize = PlotPatch {
        size: Some(2.0),
        ..PlotPatch::default()
    };
    assert!(matches!(
        plots.update(&bob, plot_a.id, &resize).await,
        Err(AppError::NotFound(_))
    ));
    assert!(matches!(
        plots.delete(&bob, plot_a.id).await,
        Err(AppError::NotFound(_))
    ));

    // A farm with plots cannot be deleted (409 FARM_HAS_PLOTS).
    assert!(matches!(
        farms.delete(&alice, farm.id).await,
        Err(AppError::Domain(CoreError::FarmHasPlots))
    ));

    // Partial updates: size is rounded to 2 decimals; null clears.
    let patch = PlotPatch {
        size: Some(1.236),
        notes: Some(Some(" loam ".to_string())),
        ..PlotPatch::default()
    };
    let updated = plots.update(&alice, plot_a.id, &patch).await.unwrap();
    assert!((updated.size - 1.24).abs() < 1e-9);
    assert_eq!(updated.notes.as_deref(), Some("loam"));
    assert_eq!(updated.name, "Plot A");

    let clear = FarmPatch {
        locality: Some(None),
        ..FarmPatch::default()
    };
    let cleared = farms.update(&alice, farm.id, &clear).await.unwrap();
    assert_eq!(cleared.locality, None);
    assert_eq!(cleared.name, "Home farm");
    assert_eq!(cleared.plot_count, 2);

    // Clean up: plots first, then the farm (which is now deletable).
    plots.delete(&alice, plot_a.id).await.unwrap();
    plots.delete(&alice, plot_b.id).await.unwrap();
    farms.delete(&alice, farm.id).await.unwrap();
    assert!(matches!(
        farms.get(&alice, farm.id).await,
        Err(AppError::NotFound(_))
    ));
}
