//! Plot database access (SeaORM only, template §5.3).
//!
//! Owner-only access is enforced in every query here: a plot is reached only
//! through a farm whose `owner_id` is the caller's Clerk user id. Another
//! farmer's plot is simply not found, exactly like a plot that does not exist.

use chrono::Utc;
use falcon_core::CoreError;
use falcon_core::plot::{NewPlot, PlotChanges};
use sea_orm::prelude::Uuid;
use sea_orm::sea_query::SelectStatement;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, IntoActiveModel,
    PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, QueryTrait, Set, SqlErr,
};

use crate::db::entities::{crop_cycles, farms, plots};
use crate::error::AppError;
use crate::plot::model::Plot;

/// Plot queries. Cloning copies a pool handle, not a connection.
#[derive(Debug, Clone)]
pub struct Repository {
    db: DatabaseConnection,
}

impl Repository {
    /// Wraps the shared connection pool.
    #[must_use]
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// All plots of `farm_id`, sorted by name then id. Empty when the farm
    /// does not exist or belongs to someone else.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn list_for_farm(&self, owner: &str, farm_id: Uuid) -> Result<Vec<Plot>, AppError> {
        let rows = plots::Entity::find()
            .filter(plots::Column::FarmId.eq(farm_id))
            .filter(plots::Column::FarmId.in_subquery(owned_farm_ids(owner)))
            .order_by_asc(plots::Column::Name)
            .order_by_asc(plots::Column::Id)
            .all(&self.db)
            .await?;
        Ok(rows.into_iter().map(Plot::from).collect())
    }

    /// Adds a plot to `farm_id`. `None` when the farm does not exist or
    /// belongs to someone else.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn create(
        &self,
        owner: &str,
        farm_id: Uuid,
        plot: &NewPlot,
    ) -> Result<Option<Plot>, AppError> {
        let owned = farms::Entity::find()
            .filter(farms::Column::Id.eq(farm_id))
            .filter(farms::Column::OwnerId.eq(owner))
            .one(&self.db)
            .await?;
        if owned.is_none() {
            return Ok(None);
        }

        let row = plots::ActiveModel {
            // Uuid v4 comes from the `uuid` crate SeaORM re-exports; the `v4`
            // feature is switched on by tower-http's `request-id` feature.
            id: Set(Uuid::new_v4()),
            farm_id: Set(farm_id),
            name: Set(plot.name().to_string()),
            size_hundredths: Set(plot.size().hundredths()),
            size_unit: Set(plot.size_unit().as_str().to_string()),
            notes: Set(plot.notes().map(str::to_string)),
            // created_at / updated_at are left out (NotSet): Postgres fills
            // them with now(), and `insert` reads them back (RETURNING).
            ..Default::default()
        };
        match row.insert(&self.db).await {
            Ok(model) => Ok(Some(Plot::from(model))),
            // The farm was deleted between the check above and this insert.
            Err(e) if is_foreign_key_violation(&e) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Applies `changes` to a plot. `None` when the plot does not exist or
    /// belongs to someone else.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn update(
        &self,
        owner: &str,
        id: Uuid,
        changes: &PlotChanges,
    ) -> Result<Option<Plot>, AppError> {
        let Some(model) = self.find_owned(owner, id).await? else {
            return Ok(None);
        };
        let mut row = model.into_active_model();
        if let Some(name) = changes.name() {
            row.name = Set(name.to_string());
        }
        if let Some(size) = changes.size() {
            row.size_hundredths = Set(size.hundredths());
        }
        if let Some(unit) = changes.size_unit() {
            row.size_unit = Set(unit.as_str().to_string());
        }
        if let Some(notes) = changes.notes() {
            row.notes = Set(notes.map(str::to_string));
        }
        row.updated_at = Set(Utc::now().fixed_offset());

        match row.update(&self.db).await {
            Ok(model) => Ok(Some(Plot::from(model))),
            // Deleted between the read and the write: same as not found.
            Err(DbErr::RecordNotUpdated) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// How many crop cycles one of `owner`'s plots has. `None` when the plot
    /// does not exist or belongs to someone else.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn crop_cycle_count(&self, owner: &str, id: Uuid) -> Result<Option<u64>, AppError> {
        if self.find_owned(owner, id).await?.is_none() {
            return Ok(None);
        }
        let count = crop_cycles::Entity::find()
            .filter(crop_cycles::Column::PlotId.eq(id))
            .count(&self.db)
            .await?;
        Ok(Some(count))
    }

    /// Deletes a plot. `false` when it does not exist or belongs to someone else.
    ///
    /// # Errors
    /// [`CoreError::PlotHasCrops`] (409) if the plot has crop cycles: the
    /// `ON DELETE RESTRICT` foreign key refuses the delete even when a cycle
    /// was added after the service checked. [`AppError::Internal`] otherwise.
    pub async fn delete(&self, owner: &str, id: Uuid) -> Result<bool, AppError> {
        let result = plots::Entity::delete_many()
            .filter(plots::Column::Id.eq(id))
            .filter(plots::Column::FarmId.in_subquery(owned_farm_ids(owner)))
            .exec(&self.db)
            .await;
        match result {
            Ok(done) => Ok(done.rows_affected > 0),
            Err(e) if is_foreign_key_violation(&e) => Err(CoreError::PlotHasCrops.into()),
            Err(e) => Err(e.into()),
        }
    }

    /// The plot row, if it exists on one of `owner`'s farms.
    async fn find_owned(&self, owner: &str, id: Uuid) -> Result<Option<plots::Model>, AppError> {
        let row = plots::Entity::find_by_id(id)
            .inner_join(farms::Entity)
            .filter(farms::Column::OwnerId.eq(owner))
            .one(&self.db)
            .await?;
        Ok(row)
    }
}

/// `SELECT id FROM farms WHERE owner_id = $1`, for `farm_id IN (…)` filters.
fn owned_farm_ids(owner: &str) -> SelectStatement {
    farms::Entity::find()
        .select_only()
        .column(farms::Column::Id)
        .filter(farms::Column::OwnerId.eq(owner))
        .into_query()
}

/// True when Postgres refused a write because of a foreign key. Matched on
/// SeaORM's typed `SqlErr`, never on the message text (template §8.2).
pub(crate) fn is_foreign_key_violation(e: &DbErr) -> bool {
    matches!(e.sql_err(), Some(SqlErr::ForeignKeyConstraintViolation(_)))
}
