//! Farmer-created calendar events.
//!
//! - `owner_id` is the Clerk user id, stored on the row itself: an event may
//!   have no crop, so ownership cannot always go through a crop cycle.
//! - `cycle_id` optionally links the event to a crop cycle. `ON DELETE SET
//!   NULL`: the event stays on the calendar if its cycle ever goes. When set,
//!   the cycle must be the same owner's; the API checks that through the
//!   owner-only cycle lookup before every write (404 otherwise).
//! - `date` is a calendar day (no time zone), Kenya date like every other
//!   date in this schema.
//! - `time` is an optional `time without time zone`: the wall-clock time in
//!   Kenya (EAT, UTC+3, no daylight saving). It is never converted; clients
//!   show it as stored.
//! - Index `(owner_id, date)`: every read is "this farmer's events", and the
//!   farm calendar reads them by date window.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Events::Table)
                    .col(ColumnDef::new(Events::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Events::OwnerId).text().not_null())
                    .col(ColumnDef::new(Events::CycleId).uuid().null())
                    .col(ColumnDef::new(Events::Title).text().not_null())
                    .col(ColumnDef::new(Events::Date).date().not_null())
                    // Kenya local wall-clock time (EAT, UTC+3); no time zone stored.
                    .col(ColumnDef::new(Events::Time).time().null())
                    .col(ColumnDef::new(Events::Notes).text().null())
                    .col(
                        ColumnDef::new(Events::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Events::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_events_cycle_id")
                            .from(Events::Table, Events::CycleId)
                            .to(CropCycles::Table, CropCycles::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Restrict),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_events_owner_id_date")
                    .table(Events::Table)
                    .col(Events::OwnerId)
                    .col(Events::Date)
                    .to_owned(),
            )
            .await?;

        // Postgres does not index a foreign key's column automatically; the
        // SET NULL on cycle delete looks rows up by it.
        manager
            .create_index(
                Index::create()
                    .name("idx_events_cycle_id")
                    .table(Events::Table)
                    .col(Events::CycleId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Events::Table).to_owned())
            .await
    }
}

/// Table and column names (see the farms migration for how `DeriveIden` works).
#[derive(DeriveIden)]
enum Events {
    Table,
    Id,
    OwnerId,
    CycleId,
    Title,
    Date,
    Time,
    Notes,
    CreatedAt,
    UpdatedAt,
}

/// The existing `crop_cycles` table, referenced by the foreign key. Each
/// migration declares the names it uses.
#[derive(DeriveIden)]
enum CropCycles {
    Table,
    Id,
}
