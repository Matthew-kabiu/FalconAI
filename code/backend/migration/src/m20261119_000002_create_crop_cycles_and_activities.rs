//! Crop cycles and their activities (TaskLabs #292).
//!
//! - `crop_cycles.plot_id` references `plots(id)` with `ON DELETE RESTRICT`:
//!   the database refuses to delete a plot that has crop cycles (the season
//!   history), so the API's 409 `PLOT_HAS_CROPS` holds even if two requests race.
//! - `crop`, `status` (and `activities.kind`, `quantity_unit`) are plain text
//!   slugs. `falcon-core` owns the allowed values; a Postgres enum type would
//!   need a migration for every new crop.
//! - `planted_on` / `done_on` are `date` (a calendar day, no time zone): a
//!   farmer plants "on 3 March", not at an instant.
//! - A partial unique index allows one open (planned or active) cycle per
//!   plot. `falcon-core` checks the same rule first (409 `OPEN_CYCLE_EXISTS`);
//!   the index is the backstop for two requests at the same moment.
//! - `activities.cycle_id` uses `ON DELETE CASCADE`: an activity means nothing
//!   without its cycle. (Cycles are not deletable through the API yet.)
//! - Quantity is whole hundredths in an `integer`, like plot size; cost is
//!   whole shillings in a `bigint`.

use sea_orm_migration::prelude::*;

/// Name of the one-open-cycle-per-plot index. `falcon-api` does not match on
/// it (it maps any unique violation on insert to 409), but naming it makes
/// the error readable in logs.
const ONE_OPEN_CYCLE_INDEX: &str = "uq_crop_cycles_one_open_per_plot";

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(CropCycles::Table)
                    .col(ColumnDef::new(CropCycles::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(CropCycles::PlotId).uuid().not_null())
                    .col(ColumnDef::new(CropCycles::Crop).text().not_null())
                    .col(ColumnDef::new(CropCycles::CustomCrop).text().null())
                    .col(ColumnDef::new(CropCycles::Variety).text().null())
                    .col(ColumnDef::new(CropCycles::PlantedOn).date().not_null())
                    .col(ColumnDef::new(CropCycles::Status).text().not_null())
                    .col(
                        ColumnDef::new(CropCycles::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(CropCycles::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_crop_cycles_plot_id")
                            .from(CropCycles::Table, CropCycles::PlotId)
                            .to(Plots::Table, Plots::Id)
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
                    .name("idx_crop_cycles_plot_id")
                    .table(CropCycles::Table)
                    .col(CropCycles::PlotId)
                    .to_owned(),
            )
            .await?;

        // A partial index (with WHERE) is plain SQL: sea-query's index builder
        // has no WHERE clause. The statement is a fixed string, no input.
        manager
            .get_connection()
            .execute_unprepared(&format!(
                "CREATE UNIQUE INDEX {ONE_OPEN_CYCLE_INDEX} ON crop_cycles (plot_id) \
                 WHERE status IN ('planned', 'active')"
            ))
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Activities::Table)
                    .col(ColumnDef::new(Activities::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Activities::CycleId).uuid().not_null())
                    .col(ColumnDef::new(Activities::Kind).text().not_null())
                    .col(ColumnDef::new(Activities::DoneOn).date().not_null())
                    .col(ColumnDef::new(Activities::Input).text().null())
                    .col(ColumnDef::new(Activities::QuantityHundredths).integer().null())
                    .col(ColumnDef::new(Activities::QuantityUnit).text().null())
                    .col(ColumnDef::new(Activities::CostKes).big_integer().null())
                    .col(ColumnDef::new(Activities::Notes).text().null())
                    .col(
                        ColumnDef::new(Activities::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Activities::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_activities_cycle_id")
                            .from(Activities::Table, Activities::CycleId)
                            .to(CropCycles::Table, CropCycles::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Restrict),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_activities_cycle_id")
                    .table(Activities::Table)
                    .col(Activities::CycleId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Activities first: they reference crop cycles. Dropping a table also
        // drops its indexes, including the partial one.
        manager
            .drop_table(Table::drop().table(Activities::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(CropCycles::Table).to_owned())
            .await
    }
}

/// Table and column names (see the farms migration for how `DeriveIden` works).
#[derive(DeriveIden)]
enum CropCycles {
    Table,
    Id,
    PlotId,
    Crop,
    CustomCrop,
    Variety,
    PlantedOn,
    Status,
    CreatedAt,
    UpdatedAt,
}

/// See [`CropCycles`].
#[derive(DeriveIden)]
enum Activities {
    Table,
    Id,
    CycleId,
    Kind,
    DoneOn,
    Input,
    QuantityHundredths,
    QuantityUnit,
    CostKes,
    Notes,
    CreatedAt,
    UpdatedAt,
}

/// The existing `plots` table, referenced by the foreign key. Each migration
/// declares the names it uses, so it never depends on another migration's code.
#[derive(DeriveIden)]
enum Plots {
    Table,
    Id,
}
