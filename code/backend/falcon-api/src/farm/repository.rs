//! Farm database access (SeaORM only, template §5.3).
//!
//! Owner-only access is enforced in every query here: each one filters on
//! `owner_id` = the caller's Clerk user id. Another farmer's farm is simply
//! not found, exactly like a farm that does not exist.

use chrono::Utc;
use falcon_core::CoreError;
use falcon_core::farm::{FarmChanges, NewFarm};
use sea_orm::prelude::{DateTimeWithTimeZone, Uuid};
use sea_orm::sea_query::{Expr, Func, SimpleExpr};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, FromQueryResult,
    IntoActiveModel, JoinType, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect,
    RelationTrait, Select, Set,
};

use crate::db::entities::{farms, plots};
use crate::error::AppError;
use crate::farm::model::Farm;
use crate::plot::repository::is_foreign_key_violation;

/// One `farms` row plus its plot count, as read by [`with_plot_count`].
/// `FromQueryResult` maps result columns to fields by name (like a row type
/// in a typed SQL client); `owner_id` is selected but not needed here.
#[derive(Debug, FromQueryResult)]
struct FarmRow {
    id: Uuid,
    name: String,
    county: String,
    locality: Option<String>,
    created_at: DateTimeWithTimeZone,
    updated_at: DateTimeWithTimeZone,
    /// `COUNT(…)` is a Postgres `bigint`, hence `i64`.
    plot_count: i64,
}

impl From<FarmRow> for Farm {
    fn from(row: FarmRow) -> Self {
        Self {
            id: row.id,
            name: row.name,
            county: row.county,
            locality: row.locality,
            // A count is never negative; `unsigned_abs` converts without a cast.
            plot_count: row.plot_count.unsigned_abs(),
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

/// Farm queries. Cloning copies a pool handle, not a connection.
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

    /// One page of `owner`'s farms, sorted by name then id, and the total
    /// number of `owner`'s farms. Two queries in all, whatever the page size:
    /// plot counts come from the same query as the farms.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn list(
        &self,
        owner: &str,
        offset: u64,
        limit: u64,
    ) -> Result<(Vec<Farm>, u64), AppError> {
        let total = farms::Entity::find()
            .filter(farms::Column::OwnerId.eq(owner))
            .count(&self.db)
            .await?;
        let rows = with_plot_count()
            .filter(farms::Column::OwnerId.eq(owner))
            .order_by_asc(farms::Column::Name)
            .order_by_asc(farms::Column::Id)
            .offset(offset)
            .limit(limit)
            .into_model::<FarmRow>()
            .all(&self.db)
            .await?;
        Ok((rows.into_iter().map(Farm::from).collect(), total))
    }

    /// One of `owner`'s farms with its plot count; `None` if it does not
    /// exist or belongs to someone else.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn find(&self, owner: &str, id: Uuid) -> Result<Option<Farm>, AppError> {
        let row = with_plot_count()
            .filter(farms::Column::Id.eq(id))
            .filter(farms::Column::OwnerId.eq(owner))
            .into_model::<FarmRow>()
            .one(&self.db)
            .await?;
        Ok(row.map(Farm::from))
    }

    /// Stores a new farm for `owner`. A new farm has no plots.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn create(&self, owner: &str, farm: &NewFarm) -> Result<Farm, AppError> {
        let row = farms::ActiveModel {
            // Uuid v4 comes from the `uuid` crate SeaORM re-exports; the `v4`
            // feature is switched on by tower-http's `request-id` feature.
            id: Set(Uuid::new_v4()),
            owner_id: Set(owner.to_string()),
            name: Set(farm.name().to_string()),
            county: Set(farm.county().as_str().to_string()),
            locality: Set(farm.locality().map(str::to_string)),
            // created_at / updated_at are left out (NotSet): Postgres fills
            // them with now(), and `insert` reads them back (RETURNING).
            ..Default::default()
        };
        let model = row.insert(&self.db).await?;
        Ok(Farm {
            id: model.id,
            name: model.name,
            county: model.county,
            locality: model.locality,
            plot_count: 0,
            created_at: model.created_at,
            updated_at: model.updated_at,
        })
    }

    /// Applies `changes` to one of `owner`'s farms and returns it with its
    /// plot count. `None` if it does not exist or belongs to someone else.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn update(
        &self,
        owner: &str,
        id: Uuid,
        changes: &FarmChanges,
    ) -> Result<Option<Farm>, AppError> {
        let found = farms::Entity::find_by_id(id)
            .filter(farms::Column::OwnerId.eq(owner))
            .one(&self.db)
            .await?;
        let Some(model) = found else {
            return Ok(None);
        };

        let mut row = model.into_active_model();
        if let Some(name) = changes.name() {
            row.name = Set(name.to_string());
        }
        if let Some(county) = changes.county() {
            row.county = Set(county.as_str().to_string());
        }
        if let Some(locality) = changes.locality() {
            row.locality = Set(locality.map(str::to_string));
        }
        row.updated_at = Set(Utc::now().fixed_offset());

        match row.update(&self.db).await {
            Ok(_) => self.find(owner, id).await,
            // Deleted between the read and the write: same as not found.
            Err(DbErr::RecordNotUpdated) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Deletes one of `owner`'s farms. `false` if it does not exist or
    /// belongs to someone else.
    ///
    /// # Errors
    /// [`CoreError::FarmHasPlots`] (409) if the farm still has plots: the
    /// `ON DELETE RESTRICT` foreign key refuses the delete even when a plot
    /// was added after the service checked. [`AppError::Internal`] otherwise.
    pub async fn delete(&self, owner: &str, id: Uuid) -> Result<bool, AppError> {
        let result = farms::Entity::delete_many()
            .filter(farms::Column::Id.eq(id))
            .filter(farms::Column::OwnerId.eq(owner))
            .exec(&self.db)
            .await;
        match result {
            Ok(done) => Ok(done.rows_affected > 0),
            Err(e) if is_foreign_key_violation(&e) => Err(CoreError::FarmHasPlots.into()),
            Err(e) => Err(e.into()),
        }
    }
}

/// `SELECT farms.*, COUNT(plots.id) AS plot_count FROM farms LEFT JOIN plots
/// … GROUP BY farms.id`: each farm with its plot count in one query. LEFT JOIN
/// keeps farms with no plots (count 0). Grouping by the primary key lets
/// Postgres return the other `farms` columns unaggregated.
fn with_plot_count() -> Select<farms::Entity> {
    farms::Entity::find()
        .column_as(
            SimpleExpr::FunctionCall(Func::count(Expr::col((
                plots::Entity,
                plots::Column::Id,
            )))),
            "plot_count",
        )
        .join(JoinType::LeftJoin, farms::Relation::Plots.def())
        .group_by(farms::Column::Id)
}
