//! Event business logic (template §5.2). Every rule comes from
//! `falcon-core`; this layer supplies "today" (Kenya time), checks a linked
//! crop cycle is the caller's, and turns "not found" into a 404.

use falcon_core::event::{EventChanges, EventFields, EventPatchFields, NewEvent};
use sea_orm::prelude::Uuid;

use crate::crop_cycle;
use crate::error::AppError;
use crate::event::model::{Event, EventInput, EventPatch};
use crate::event::repository::Repository;
use crate::platform::clock::today_in_kenya;

/// Event use cases. Built once in `AppState::new`.
#[derive(Debug, Clone)]
pub struct Service {
    repo: Repository,
    // A linked cycle must be the caller's: checked with the owner-only cycle
    // lookup (like the activity service).
    cycles: crop_cycle::Repository,
}

impl Service {
    /// Wires the service to its repositories.
    #[must_use]
    pub fn new(repo: Repository, cycles: crop_cycle::Repository) -> Self {
        Self { repo, cycles }
    }

    /// Puts a new event on `owner`'s calendar.
    ///
    /// The fields are checked first (no database needed), then the linked
    /// cycle, if any.
    ///
    /// # Errors
    /// 422 listing every refused field; 404 when `cycleId` does not exist or
    /// is not `owner`'s; 500 on a database failure.
    pub async fn create(&self, owner: &str, input: &EventInput) -> Result<Event, AppError> {
        let fields = EventFields {
            title: &input.title,
            description: input.description.as_deref(),
            date: Some(input.date),
            time: input.time.as_deref(),
            notes: input.notes.as_deref(),
        };
        let event = NewEvent::parse(&fields, today_in_kenya())?;
        if let Some(cycle_id) = input.cycle_id {
            self.ensure_cycle_is_owned(owner, cycle_id).await?;
        }
        self.repo.create(owner, input.cycle_id, &event).await
    }

    /// One of `owner`'s events.
    ///
    /// # Errors
    /// 404 when it does not exist or is not `owner`'s; 500 on a database failure.
    pub async fn get(&self, owner: &str, id: Uuid) -> Result<Event, AppError> {
        self.repo
            .find(owner, id)
            .await?
            .ok_or(AppError::NotFound("event"))
    }

    /// Changes the sent fields of one of `owner`'s events. `null` clears
    /// `description`, `time`, `cycleId` or `notes`. A sent `date` must be today or later;
    /// a past event's other fields can still be edited.
    ///
    /// # Errors
    /// 422 listing every refused field; 404 when the event, or a newly linked
    /// cycle, does not exist or is not `owner`'s; 500 on a database failure.
    pub async fn update(
        &self,
        owner: &str,
        id: Uuid,
        patch: &EventPatch,
    ) -> Result<Event, AppError> {
        let fields = EventPatchFields {
            title: patch.title.as_deref(),
            // Option<Option<String>> → Option<Option<&str>>: borrow both layers.
            description: patch.description.as_ref().map(Option::as_deref),
            date: patch.date,
            time: patch.time.as_ref().map(Option::as_deref),
            notes: patch.notes.as_ref().map(Option::as_deref),
        };
        let changes = EventChanges::parse(&fields, today_in_kenya())?;
        let model = self
            .repo
            .find_model(owner, id)
            .await?
            .ok_or(AppError::NotFound("event"))?;
        if let Some(Some(cycle_id)) = patch.cycle_id {
            self.ensure_cycle_is_owned(owner, cycle_id).await?;
        }
        self.repo
            .update(owner, model, &changes, patch.cycle_id)
            .await?
            .ok_or(AppError::NotFound("event"))
    }

    /// Deletes one of `owner`'s events.
    ///
    /// # Errors
    /// 404 when it does not exist or is not `owner`'s; 500 on a database failure.
    pub async fn delete(&self, owner: &str, id: Uuid) -> Result<(), AppError> {
        if self.repo.delete(owner, id).await? {
            Ok(())
        } else {
            Err(AppError::NotFound("event"))
        }
    }

    /// 404 unless the cycle exists on one of `owner`'s farms. Open or closed
    /// does not matter: an event may be about a past crop.
    async fn ensure_cycle_is_owned(&self, owner: &str, cycle_id: Uuid) -> Result<(), AppError> {
        if self.cycles.find_model(owner, cycle_id).await?.is_none() {
            return Err(AppError::NotFound("crop cycle"));
        }
        Ok(())
    }
}
