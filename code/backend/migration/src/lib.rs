//! Falcon AI database migrations.
//!
//! Each migration is a Rust file `mYYYYMMDD_HHMMSS_<name>.rs` created with
//! `sea-orm-cli migrate generate <name>` and registered in [`Migrator::migrations`].
//! Migrations are immutable once merged: fix forward with a new one (template §12.3).

pub use sea_orm_migration::prelude::*;

// `mod` makes the file part of this crate; without it Rust ignores the file
// entirely (there is no "every .rs file in the folder" like Node's resolver).
mod m20261119_000001_create_farms_and_plots;
mod m20261119_000002_create_crop_cycles_and_activities;
mod m20261119_000003_create_events;
mod m20261119_000004_add_event_description;

/// The list of all migrations, applied in order.
///
/// `falcon-api` calls `Migrator::up` at startup, before the listener binds.
pub struct Migrator;

impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        // Register new migrations here, oldest first.
        vec![
            Box::new(m20261119_000001_create_farms_and_plots::Migration),
            Box::new(m20261119_000002_create_crop_cycles_and_activities::Migration),
            Box::new(m20261119_000003_create_events::Migration),
            Box::new(m20261119_000004_add_event_description::Migration),
        ]
    }
}
