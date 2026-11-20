//! Crop-cycle database access (SeaORM only, template §5.3).
//!
//! Owner-only access is enforced in every query here: a cycle is reached only
//! through its plot's farm, joined and filtered on `farms.owner_id` = the
//! caller's Clerk user id. Another farmer's cycle is simply not found,
//! exactly like a cycle that does not exist.

use chrono::{NaiveDate, Utc};
use falcon_core::CoreError;
use falcon_core::crop_cycle::{CropCycleChanges, CycleStatus, NewCropCycle};
use sea_orm::prelude::{DateTimeWithTimeZone, Uuid};
use sea_orm::sea_query::{Expr, SelectStatement};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, FromQueryResult,
    IntoActiveModel, JoinType, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, QueryTrait,
    RelationTrait, Select, Set, SqlErr,
};

use crate::crop_cycle::model::{CropCycle, StatusFilter};
use crate::db::entities::{activities, crop_cycles, farms, plots};
use crate::error::AppError;
use crate::plot::repository::is_foreign_key_violation;

/// One `crop_cycles` row plus its plot's and farm's names, as read by
/// [`with_names`]. `FromQueryResult` maps result columns to fields by name.
#[derive(Debug, FromQueryResult)]
struct CycleRow {
    id: Uuid,
    plot_id: Uuid,
    farm_id: Uuid,
    plot_name: String,
    farm_name: String,
    crop: String,
    custom_crop: Option<String>,
    variety: Option<String>,
    planted_on: NaiveDate,
    status: String,
    created_at: DateTimeWithTimeZone,
    updated_at: DateTimeWithTimeZone,
}

impl From<CycleRow> for CropCycle {
    fn from(row: CycleRow) -> Self {
        Self {
            id: row.id,
            plot_id: row.plot_id,
            farm_id: row.farm_id,
            plot_name: row.plot_name,
            farm_name: row.farm_name,
            crop: row.crop,
            custom_crop: row.custom_crop,
            variety: row.variety,
            planted_on: row.planted_on,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

/// A cycle's activity totals, from one aggregate query.
#[derive(Debug, Clone, Copy, PartialEq, Eq, FromQueryResult)]
pub struct Totals {
    /// `COUNT(*)`: a Postgres `bigint`, hence `i64`.
    pub activity_count: i64,
    /// `SUM(cost_kes)` with no cost counted as 0, cast back to `bigint`
    /// (Postgres sums a `bigint` column as `numeric`, which would need a
    /// decimal crate to read).
    pub season_cost_kes: i64,
}

/// Crop-cycle queries. Cloning copies a pool handle, not a connection.
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

    /// One page of `owner`'s cycles across all their plots, newest planting
    /// first (then id), and the total. Two queries whatever the page size:
    /// plot and farm names come from the same query as the cycles.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn list(
        &self,
        owner: &str,
        status: Option<StatusFilter>,
        offset: u64,
        limit: u64,
    ) -> Result<(Vec<CropCycle>, u64), AppError> {
        let total = filter_status(owned(owner), status).count(&self.db).await?;
        let rows = filter_status(with_names(owner), status)
            .order_by_desc(crop_cycles::Column::PlantedOn)
            .order_by_asc(crop_cycles::Column::Id)
            .offset(offset)
            .limit(limit)
            .into_model::<CycleRow>()
            .all(&self.db)
            .await?;
        Ok((rows.into_iter().map(CropCycle::from).collect(), total))
    }

    /// Every cycle of one plot, newest planting first. Empty when the plot
    /// has none, is not `owner`'s, or does not exist (the service tells
    /// those apart with [`Self::plot_is_owned`]).
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn list_for_plot(
        &self,
        owner: &str,
        plot_id: Uuid,
    ) -> Result<Vec<CropCycle>, AppError> {
        let rows = with_names(owner)
            .filter(crop_cycles::Column::PlotId.eq(plot_id))
            .order_by_desc(crop_cycles::Column::PlantedOn)
            .order_by_asc(crop_cycles::Column::Id)
            .into_model::<CycleRow>()
            .all(&self.db)
            .await?;
        Ok(rows.into_iter().map(CropCycle::from).collect())
    }

    /// Every open (planned or active) cycle of `owner`, across all their
    /// plots, with plot and farm names: one query. Oldest planting first,
    /// then id. Unpaged: a farmer has at most one open cycle per plot.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn list_open(&self, owner: &str) -> Result<Vec<CropCycle>, AppError> {
        let rows = filter_status(with_names(owner), Some(StatusFilter::Open))
            .order_by_asc(crop_cycles::Column::PlantedOn)
            .order_by_asc(crop_cycles::Column::Id)
            .into_model::<CycleRow>()
            .all(&self.db)
            .await?;
        Ok(rows.into_iter().map(CropCycle::from).collect())
    }

    /// True when the plot exists on one of `owner`'s farms.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn plot_is_owned(&self, owner: &str, plot_id: Uuid) -> Result<bool, AppError> {
        let found = plots::Entity::find_by_id(plot_id)
            .inner_join(farms::Entity)
            .filter(farms::Column::OwnerId.eq(owner))
            .count(&self.db)
            .await?;
        Ok(found > 0)
    }

    /// How many open (planned or active) cycles the plot has.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn count_open(&self, plot_id: Uuid) -> Result<u64, AppError> {
        let count = crop_cycles::Entity::find()
            .filter(crop_cycles::Column::PlotId.eq(plot_id))
            .filter(crop_cycles::Column::Status.is_in(open_slugs()))
            .count(&self.db)
            .await?;
        Ok(count)
    }

    /// One of `owner`'s cycles with plot and farm names; `None` if it does
    /// not exist or belongs to someone else.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn find(&self, owner: &str, id: Uuid) -> Result<Option<CropCycle>, AppError> {
        let row = with_names(owner)
            .filter(crop_cycles::Column::Id.eq(id))
            .into_model::<CycleRow>()
            .one(&self.db)
            .await?;
        Ok(row.map(CropCycle::from))
    }

    /// The raw row of one of `owner`'s cycles (for its stored status and
    /// planting date); `None` if it does not exist or is someone else's.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn find_model(
        &self,
        owner: &str,
        id: Uuid,
    ) -> Result<Option<crop_cycles::Model>, AppError> {
        let row = owned(owner)
            .filter(crop_cycles::Column::Id.eq(id))
            .one(&self.db)
            .await?;
        Ok(row)
    }

    /// The activity count and season cost of a cycle, in one query.
    /// The caller has already checked the cycle is the owner's.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn totals(&self, cycle_id: Uuid) -> Result<Totals, AppError> {
        let totals = activities::Entity::find()
            .select_only()
            // Fixed SQL fragments, no input in them. `COALESCE(…, 0)`: a cycle
            // with no costs sums to NULL, which should read as 0.
            .column_as(Expr::cust("COUNT(*)"), "activity_count")
            .column_as(
                Expr::cust("COALESCE(SUM(cost_kes), 0)::bigint"),
                "season_cost_kes",
            )
            .filter(activities::Column::CycleId.eq(cycle_id))
            .into_model::<Totals>()
            .one(&self.db)
            .await?;
        // An aggregate without GROUP BY always returns one row.
        Ok(totals.unwrap_or(Totals {
            activity_count: 0,
            season_cost_kes: 0,
        }))
    }

    /// Stores a new cycle on `plot_id` and returns it with names. `None` when
    /// the plot was deleted meanwhile. The caller has checked ownership and
    /// the open-cycle rule.
    ///
    /// # Errors
    /// [`CoreError::OpenCycleExists`] (409) when the one-open-cycle-per-plot
    /// index refuses the insert (another open cycle was added between the
    /// service's check and this insert); [`AppError::Internal`] otherwise.
    pub async fn create(
        &self,
        owner: &str,
        plot_id: Uuid,
        cycle: &NewCropCycle,
    ) -> Result<Option<CropCycle>, AppError> {
        let id = Uuid::new_v4();
        let row = crop_cycles::ActiveModel {
            id: Set(id),
            plot_id: Set(plot_id),
            crop: Set(cycle.crop().as_str().to_string()),
            custom_crop: Set(cycle.custom_crop().map(str::to_string)),
            variety: Set(cycle.variety().map(str::to_string)),
            planted_on: Set(cycle.planted_on()),
            status: Set(cycle.status().as_str().to_string()),
            // created_at / updated_at are filled by Postgres (now()).
            ..Default::default()
        };
        match row.insert(&self.db).await {
            Ok(_) => self.find(owner, id).await,
            Err(e) if is_unique_violation(&e) => Err(CoreError::OpenCycleExists.into()),
            // The plot was deleted between the ownership check and this insert.
            Err(e) if is_foreign_key_violation(&e) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Applies `changes` (already checked, including the status move) to a
    /// cycle row read by [`Self::find_model`], and returns it with names.
    /// `None` if it was deleted meanwhile.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn update(
        &self,
        owner: &str,
        model: crop_cycles::Model,
        changes: &CropCycleChanges,
    ) -> Result<Option<CropCycle>, AppError> {
        let id = model.id;
        let mut row = model.into_active_model();
        if let Some(variety) = changes.variety() {
            row.variety = Set(variety.map(str::to_string));
        }
        if let Some(planted_on) = changes.planted_on() {
            row.planted_on = Set(planted_on);
        }
        if let Some(status) = changes.status() {
            row.status = Set(status.as_str().to_string());
        }
        row.updated_at = Set(Utc::now().fixed_offset());

        match row.update(&self.db).await {
            Ok(_) => self.find(owner, id).await,
            // Deleted between the read and the write: same as not found.
            Err(DbErr::RecordNotUpdated) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
}

/// `crop_cycles` joined to their plot and farm, limited to `owner`'s farms.
/// Every cycle query starts here, which is what makes them owner-only.
fn owned(owner: &str) -> Select<crop_cycles::Entity> {
    crop_cycles::Entity::find()
        .join(JoinType::InnerJoin, crop_cycles::Relation::Plots.def())
        .join(JoinType::InnerJoin, plots::Relation::Farms.def())
        .filter(farms::Column::OwnerId.eq(owner))
}

/// [`owned`] plus the plot's farm id, the plot's name and the farm's name:
/// one query, no N+1.
fn with_names(owner: &str) -> Select<crop_cycles::Entity> {
    owned(owner)
        .column_as(Expr::col((plots::Entity, plots::Column::FarmId)), "farm_id")
        .column_as(Expr::col((plots::Entity, plots::Column::Name)), "plot_name")
        .column_as(Expr::col((farms::Entity, farms::Column::Name)), "farm_name")
}

/// `SELECT crop_cycles.id … WHERE farms.owner_id = $1`, for
/// `cycle_id IN (…)` filters (owner-only activity deletes).
pub(crate) fn owned_cycle_ids(owner: &str) -> SelectStatement {
    owned(owner)
        .select_only()
        .column(crop_cycles::Column::Id)
        .into_query()
}

/// `SELECT crop_cycles.id … WHERE farms.owner_id = $1 AND status IN
/// ('planned', 'active')`, for `cycle_id IN (…)` filters (the farm
/// calendar's activities).
pub(crate) fn owned_open_cycle_ids(owner: &str) -> SelectStatement {
    filter_status(owned(owner), Some(StatusFilter::Open))
        .select_only()
        .column(crop_cycles::Column::Id)
        .into_query()
}

fn filter_status(
    select: Select<crop_cycles::Entity>,
    status: Option<StatusFilter>,
) -> Select<crop_cycles::Entity> {
    match status {
        None => select,
        Some(StatusFilter::Open) => select.filter(crop_cycles::Column::Status.is_in(open_slugs())),
        Some(StatusFilter::Closed) => {
            select.filter(crop_cycles::Column::Status.is_not_in(open_slugs()))
        }
    }
}

/// The open statuses' slugs, from `falcon-core` (`planned`, `active`).
fn open_slugs() -> Vec<&'static str> {
    CycleStatus::ALL
        .into_iter()
        .filter(|s| s.is_open())
        .map(CycleStatus::as_str)
        .collect()
}

/// True when Postgres refused a write because of a unique index. Matched on
/// SeaORM's typed `SqlErr`, never on the message text (template §8.2).
fn is_unique_violation(e: &DbErr) -> bool {
    matches!(e.sql_err(), Some(SqlErr::UniqueConstraintViolation(_)))
}
