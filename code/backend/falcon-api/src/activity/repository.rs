//! Activity database access (SeaORM only, template §5.3).
//!
//! Owner-only access is enforced in every query here: an activity is reached
//! only through its crop cycle, plot and farm, joined and filtered on
//! `farms.owner_id`. Another farmer's activity is simply not found.

use chrono::{NaiveDate, Utc};
use falcon_core::activity::{ActivityChanges, NewActivity};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, DbErr, EntityTrait, IntoActiveModel,
    JoinType, QueryFilter, QueryOrder, QuerySelect, RelationTrait, Set,
};

use crate::activity::model::Activity;
use crate::crop_cycle::repository::{owned_cycle_ids, owned_open_cycle_ids};
use crate::db::entities::{activities, crop_cycles, farms, plots};
use crate::error::AppError;
use crate::plot::repository::is_foreign_key_violation;

/// Activity queries. Cloning copies a pool handle, not a connection.
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

    /// One page of a cycle's activities, newest first: `done_on` descending,
    /// then `created_at` descending, then id. The caller has already checked
    /// the cycle is the owner's; the count and season total come from
    /// `crop_cycle::Repository::totals`.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn list(
        &self,
        cycle_id: Uuid,
        offset: u64,
        limit: u64,
    ) -> Result<Vec<Activity>, AppError> {
        let rows = activities::Entity::find()
            .filter(activities::Column::CycleId.eq(cycle_id))
            .order_by_desc(activities::Column::DoneOn)
            .order_by_desc(activities::Column::CreatedAt)
            .order_by_asc(activities::Column::Id)
            .offset(offset)
            .limit(limit)
            .all(&self.db)
            .await?;
        Ok(rows.into_iter().map(Activity::from).collect())
    }

    /// Every activity on `owner`'s open (planned or active) cycles done
    /// between `from` and `to` (both included), oldest first: one query,
    /// whatever the number of cycles. Owner-only through the cycle → plot →
    /// farm subquery. Unpaged: the farm calendar's window bounds it.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn list_on_open_cycles(
        &self,
        owner: &str,
        from: NaiveDate,
        to: NaiveDate,
    ) -> Result<Vec<Activity>, AppError> {
        let rows = activities::Entity::find()
            .filter(activities::Column::CycleId.in_subquery(owned_open_cycle_ids(owner)))
            .filter(activities::Column::DoneOn.between(from, to))
            .order_by_asc(activities::Column::DoneOn)
            .order_by_asc(activities::Column::Id)
            .all(&self.db)
            .await?;
        Ok(rows.into_iter().map(Activity::from).collect())
    }

    /// Stores a new activity on `cycle_id`. `None` when the cycle was
    /// deleted meanwhile. The caller has checked ownership.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn create(
        &self,
        cycle_id: Uuid,
        activity: &NewActivity,
    ) -> Result<Option<Activity>, AppError> {
        let (quantity, unit) = match activity.quantity() {
            Some((q, u)) => (Some(q.hundredths()), Some(u.as_str().to_string())),
            None => (None, None),
        };
        let row = activities::ActiveModel {
            id: Set(Uuid::new_v4()),
            cycle_id: Set(cycle_id),
            kind: Set(activity.kind().as_str().to_string()),
            done_on: Set(activity.done_on()),
            input: Set(activity.input().map(str::to_string)),
            quantity_hundredths: Set(quantity),
            quantity_unit: Set(unit),
            cost_kes: Set(activity.cost_kes()),
            notes: Set(activity.notes().map(str::to_string)),
            // created_at / updated_at are filled by Postgres (now()).
            ..Default::default()
        };
        match row.insert(&self.db).await {
            Ok(model) => Ok(Some(Activity::from(model))),
            Err(e) if is_foreign_key_violation(&e) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// One of `owner`'s activities and its cycle's planting date (the
    /// `doneOn` rule needs it); `None` if it does not exist or is someone else's.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn find_owned(
        &self,
        owner: &str,
        id: Uuid,
    ) -> Result<Option<(activities::Model, NaiveDate)>, AppError> {
        // `find_also_related` joins the cycle and returns both rows as a
        // pair; the two extra joins reach the farm for the owner filter.
        let found = activities::Entity::find_by_id(id)
            .find_also_related(crop_cycles::Entity)
            .join(JoinType::InnerJoin, crop_cycles::Relation::Plots.def())
            .join(JoinType::InnerJoin, plots::Relation::Farms.def())
            .filter(farms::Column::OwnerId.eq(owner))
            .one(&self.db)
            .await?;
        // `and_then` drops a row whose cycle is missing (cannot happen with
        // the foreign key, but the type allows it).
        Ok(found.and_then(|(activity, cycle)| cycle.map(|c| (activity, c.planted_on))))
    }

    /// Applies checked `changes` to a row read by [`Self::find_owned`].
    /// `None` if it was deleted meanwhile.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn update(
        &self,
        model: activities::Model,
        changes: &ActivityChanges,
    ) -> Result<Option<Activity>, AppError> {
        let mut row = model.into_active_model();
        if let Some(kind) = changes.kind() {
            row.kind = Set(kind.as_str().to_string());
        }
        if let Some(done_on) = changes.done_on() {
            row.done_on = Set(done_on);
        }
        if let Some(input) = changes.input() {
            row.input = Set(input.map(str::to_string));
        }
        if let Some(quantity) = changes.quantity() {
            row.quantity_hundredths = Set(quantity.map(|q| q.hundredths()));
        }
        if let Some(unit) = changes.quantity_unit() {
            row.quantity_unit = Set(unit.map(|u| u.as_str().to_string()));
        }
        if let Some(cost) = changes.cost_kes() {
            row.cost_kes = Set(cost);
        }
        if let Some(notes) = changes.notes() {
            row.notes = Set(notes.map(str::to_string));
        }
        row.updated_at = Set(Utc::now().fixed_offset());

        match row.update(&self.db).await {
            Ok(model) => Ok(Some(Activity::from(model))),
            Err(DbErr::RecordNotUpdated) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Deletes one of `owner`'s activities. `false` when it does not exist or
    /// belongs to someone else.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn delete(&self, owner: &str, id: Uuid) -> Result<bool, AppError> {
        let result = activities::Entity::delete_many()
            .filter(activities::Column::Id.eq(id))
            .filter(activities::Column::CycleId.in_subquery(owned_cycle_ids(owner)))
            .exec(&self.db)
            .await?;
        Ok(result.rows_affected > 0)
    }
}
