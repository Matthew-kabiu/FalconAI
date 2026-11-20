//! Farms and their plots (TaskLabs #290).
//!
//! - `farms.owner_id` is the Clerk user id (`AuthUser.user_id`, e.g. `user_2abc…`).
//!   There is no users table: Clerk owns accounts, so this is plain text, not a
//!   foreign key. Every farm query filters on it (owner-only access).
//! - `plots.farm_id` references `farms(id)` with `ON DELETE RESTRICT`: the
//!   database itself refuses to delete a farm that still has plots, so the API's
//!   409 `FARM_HAS_PLOTS` holds even if two requests race.
//! - Plot size is stored as whole hundredths in an `integer` (0.5 acres = 50),
//!   not as a float. Floats cannot hold 0.1 exactly, and a `numeric` column would
//!   need the `rust_decimal`/`bigdecimal` crate on the Rust side. `falcon-core`
//!   rounds the size to 2 decimal places, so hundredths lose nothing.

use sea_orm_migration::prelude::*;

/// `#[derive(DeriveMigrationName)]` names the migration after this file
/// (`m20261119_000001_create_farms_and_plots`), which is what `seaql_migrations` records.
#[derive(DeriveMigrationName)]
pub struct Migration;

// `async fn` inside a trait impl needs the `async_trait` macro here because
// SeaORM's `MigrationTrait` is declared with it (it boxes the returned future).
#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Farms::Table)
                    .col(ColumnDef::new(Farms::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Farms::OwnerId).text().not_null())
                    .col(ColumnDef::new(Farms::Name).text().not_null())
                    .col(ColumnDef::new(Farms::County).text().not_null())
                    .col(ColumnDef::new(Farms::Locality).text().null())
                    .col(
                        ColumnDef::new(Farms::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Farms::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Every farm query filters by owner, so index it.
        manager
            .create_index(
                Index::create()
                    .name("idx_farms_owner_id")
                    .table(Farms::Table)
                    .col(Farms::OwnerId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Plots::Table)
                    .col(ColumnDef::new(Plots::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Plots::FarmId).uuid().not_null())
                    .col(ColumnDef::new(Plots::Name).text().not_null())
                    .col(ColumnDef::new(Plots::SizeHundredths).integer().not_null())
                    .col(ColumnDef::new(Plots::SizeUnit).text().not_null())
                    .col(ColumnDef::new(Plots::Notes).text().null())
                    .col(
                        ColumnDef::new(Plots::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Plots::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_plots_farm_id")
                            .from(Plots::Table, Plots::FarmId)
                            .to(Farms::Table, Farms::Id)
                            .on_delete(ForeignKeyAction::Restrict)
                            .on_update(ForeignKeyAction::Restrict),
                    )
                    .to_owned(),
            )
            .await?;

        // Postgres does not index a foreign key's column automatically.
        manager
            .create_index(
                Index::create()
                    .name("idx_plots_farm_id")
                    .table(Plots::Table)
                    .col(Plots::FarmId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Plots first: they reference farms.
        manager
            .drop_table(Table::drop().table(Plots::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Farms::Table).to_owned())
            .await
    }
}

/// Table and column names. `DeriveIden` turns each variant into a snake_case
/// SQL identifier (`OwnerId` → `owner_id`) and `Table` into the enum's name
/// (`Farms` → `farms`), so no name is typed twice as a string.
#[derive(DeriveIden)]
enum Farms {
    Table,
    Id,
    OwnerId,
    Name,
    County,
    Locality,
    CreatedAt,
    UpdatedAt,
}

/// See [`Farms`].
#[derive(DeriveIden)]
enum Plots {
    Table,
    Id,
    FarmId,
    Name,
    SizeHundredths,
    SizeUnit,
    Notes,
    CreatedAt,
    UpdatedAt,
}
