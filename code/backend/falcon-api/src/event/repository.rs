//! Event database access (SeaORM only, template §5.3).
//!
//! Owner-only access is enforced in every query here: each one filters on
//! `events.owner_id` = the caller's Clerk user id. Another farmer's event is
//! simply not found, exactly like an event that does not exist.
//!
//! An event's crop names come from its (optional) cycle through LEFT JOINs
//! cycle → plot → farm, in the same query. The join is owner-filtered too:
//! a row whose linked cycle is not the caller's farm's is not returned (the
//! service never stores one; this is the backstop).

use chrono::{NaiveDate, NaiveTime, Utc};
use falcon_core::event::{EventChanges, NewEvent, format_time};
use sea_orm::prelude::{DateTimeWithTimeZone, Uuid};
use sea_orm::sea_query::Expr;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, DatabaseConnection, DbErr, EntityTrait,
    FromQueryResult, IntoActiveModel, JoinType, QueryFilter, QueryOrder, QuerySelect,
    RelationTrait, Select, Set,
};

use crate::db::entities::{crop_cycles, events, farms, plots};
use crate::error::AppError;
use crate::event::model::{CalendarEvent, Event};
use crate::plot::repository::is_foreign_key_violation;

/// One `events` row plus its linked cycle's crop, plot and farm names, as
/// read by [`with_cycle`]. `FromQueryResult` maps result columns to fields
/// by name; the names are null when the event has no cycle.
#[derive(Debug, FromQueryResult)]
struct EventRow {
    id: Uuid,
    title: String,
    description: Option<String>,
    date: NaiveDate,
    time: Option<NaiveTime>,
    cycle_id: Option<Uuid>,
    notes: Option<String>,
    created_at: DateTimeWithTimeZone,
    updated_at: DateTimeWithTimeZone,
    crop: Option<String>,
    custom_crop: Option<String>,
    plot_name: Option<String>,
    farm_name: Option<String>,
}

impl From<EventRow> for CalendarEvent {
    fn from(row: EventRow) -> Self {
        Self {
            event: Event {
                id: row.id,
                title: row.title,
                description: row.description,
                date: row.date,
                // Stored as a `time`; falcon-core owns the `HH:MM` wire form.
                time: row.time.map(format_time),
                cycle_id: row.cycle_id,
                crop: row.crop,
                custom_crop: row.custom_crop,
                plot_name: row.plot_name,
                notes: row.notes,
                created_at: row.created_at,
                updated_at: row.updated_at,
            },
            farm_name: row.farm_name,
        }
    }
}

/// Event queries. Cloning copies a pool handle, not a connection.
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

    /// One of `owner`'s events with its crop names; `None` if it does not
    /// exist or belongs to someone else.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn find(&self, owner: &str, id: Uuid) -> Result<Option<Event>, AppError> {
        let row = with_cycle(owner)
            .filter(events::Column::Id.eq(id))
            .into_model::<EventRow>()
            .one(&self.db)
            .await?;
        Ok(row.map(|r| CalendarEvent::from(r).event))
    }

    /// The raw row of one of `owner`'s events (for an update); `None` if it
    /// does not exist or is someone else's.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn find_model(
        &self,
        owner: &str,
        id: Uuid,
    ) -> Result<Option<events::Model>, AppError> {
        let row = events::Entity::find_by_id(id)
            .filter(events::Column::OwnerId.eq(owner))
            .one(&self.db)
            .await?;
        Ok(row)
    }

    /// Every one of `owner`'s events dated `from` to `to` (both included),
    /// with their linked cycle's names: one query, whatever the number of
    /// events or crops. Events linked to a closed crop are included. Oldest
    /// first; the farm calendar sorts again. Unpaged: the window bounds it.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn list_in_window(
        &self,
        owner: &str,
        from: NaiveDate,
        to: NaiveDate,
    ) -> Result<Vec<CalendarEvent>, AppError> {
        let rows = with_cycle(owner)
            .filter(events::Column::Date.between(from, to))
            .order_by_asc(events::Column::Date)
            .order_by_asc(events::Column::Id)
            .into_model::<EventRow>()
            .all(&self.db)
            .await?;
        Ok(rows.into_iter().map(CalendarEvent::from).collect())
    }

    /// Stores a new event for `owner`, optionally linked to `cycle_id`, and
    /// returns it with names. The caller has checked the cycle is `owner`'s.
    ///
    /// # Errors
    /// [`AppError::NotFound`] (`crop cycle`) when the cycle was deleted
    /// between that check and this insert; [`AppError::Internal`] otherwise.
    pub async fn create(
        &self,
        owner: &str,
        cycle_id: Option<Uuid>,
        event: &NewEvent,
    ) -> Result<Event, AppError> {
        let id = Uuid::new_v4();
        let row = events::ActiveModel {
            id: Set(id),
            owner_id: Set(owner.to_string()),
            cycle_id: Set(cycle_id),
            title: Set(event.title().to_string()),
            description: Set(event.description().map(str::to_string)),
            date: Set(event.date()),
            time: Set(event.time()),
            notes: Set(event.notes().map(str::to_string)),
            // created_at / updated_at are filled by Postgres (now()).
            ..Default::default()
        };
        match row.insert(&self.db).await {
            Ok(_) => self
                .find(owner, id)
                .await?
                .ok_or(AppError::NotFound("event")),
            Err(e) if is_foreign_key_violation(&e) => Err(AppError::NotFound("crop cycle")),
            Err(e) => Err(e.into()),
        }
    }

    /// Applies checked `changes` and, when sent, the (already checked) crop
    /// link to a row read by [`Self::find_model`], and returns it with
    /// names. `None` if it was deleted meanwhile.
    ///
    /// # Errors
    /// [`AppError::NotFound`] (`crop cycle`) when the new cycle was deleted
    /// meanwhile; [`AppError::Internal`] on a database failure.
    pub async fn update(
        &self,
        owner: &str,
        model: events::Model,
        changes: &EventChanges,
        cycle_id: Option<Option<Uuid>>,
    ) -> Result<Option<Event>, AppError> {
        let id = model.id;
        let mut row = model.into_active_model();
        if let Some(title) = changes.title() {
            row.title = Set(title.to_string());
        }
        if let Some(description) = changes.description() {
            row.description = Set(description.map(str::to_string));
        }
        if let Some(date) = changes.date() {
            row.date = Set(date);
        }
        if let Some(time) = changes.time() {
            row.time = Set(time);
        }
        if let Some(notes) = changes.notes() {
            row.notes = Set(notes.map(str::to_string));
        }
        if let Some(cycle_id) = cycle_id {
            row.cycle_id = Set(cycle_id);
        }
        row.updated_at = Set(Utc::now().fixed_offset());

        match row.update(&self.db).await {
            Ok(_) => self.find(owner, id).await,
            // Deleted between the read and the write: same as not found.
            Err(DbErr::RecordNotUpdated) => Ok(None),
            Err(e) if is_foreign_key_violation(&e) => Err(AppError::NotFound("crop cycle")),
            Err(e) => Err(e.into()),
        }
    }

    /// Deletes one of `owner`'s events. `false` when it does not exist or
    /// belongs to someone else.
    ///
    /// # Errors
    /// [`AppError::Internal`] on a database failure.
    pub async fn delete(&self, owner: &str, id: Uuid) -> Result<bool, AppError> {
        let result = events::Entity::delete_many()
            .filter(events::Column::Id.eq(id))
            .filter(events::Column::OwnerId.eq(owner))
            .exec(&self.db)
            .await?;
        Ok(result.rows_affected > 0)
    }
}

/// `owner`'s events, LEFT JOINed to their optional cycle, its plot and farm,
/// plus the crop, custom crop, plot and farm names: one query, no N+1.
/// Every event read starts here, which is what makes them owner-only. A
/// linked cycle must also be on one of `owner`'s farms.
fn with_cycle(owner: &str) -> Select<events::Entity> {
    events::Entity::find()
        .join(JoinType::LeftJoin, events::Relation::CropCycles.def())
        .join(JoinType::LeftJoin, crop_cycles::Relation::Plots.def())
        .join(JoinType::LeftJoin, plots::Relation::Farms.def())
        .filter(events::Column::OwnerId.eq(owner))
        .filter(
            Condition::any()
                .add(events::Column::CycleId.is_null())
                .add(farms::Column::OwnerId.eq(owner)),
        )
        .column_as(Expr::col((crop_cycles::Entity, crop_cycles::Column::Crop)), "crop")
        .column_as(
            Expr::col((crop_cycles::Entity, crop_cycles::Column::CustomCrop)),
            "custom_crop",
        )
        .column_as(Expr::col((plots::Entity, plots::Column::Name)), "plot_name")
        .column_as(Expr::col((farms::Entity, farms::Column::Name)), "farm_name")
}
