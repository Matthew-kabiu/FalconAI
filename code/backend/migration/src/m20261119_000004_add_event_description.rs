//! Adds an optional `description` to farmer calendar events: what the event
//! is about, up to 1000 characters (checked in `falcon-core`, like `notes`).
//!
//! Nullable with no default, so existing rows simply have no description.
//! A new migration rather than an edit of `create_events`: migrations are
//! immutable once applied (fix forward).

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Events::Table)
                    .add_column(ColumnDef::new(Events::Description).text().null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Events::Table)
                    .drop_column(Events::Description)
                    .to_owned(),
            )
            .await
    }
}

/// Table and column names (see the farms migration for how `DeriveIden` works).
#[derive(DeriveIden)]
enum Events {
    Table,
    Description,
}
