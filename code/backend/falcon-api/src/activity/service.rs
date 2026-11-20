//! Activity business logic (template §5.2). Every rule comes from
//! `falcon-core`; this layer checks the cycle is the caller's, supplies
//! "today" (Kenya time) and the cycle's planting date, and turns "not found"
//! into a 404.

use falcon_core::activity::{
    ActivityChanges, ActivityFields, ActivityPatchFields, NewActivity, StoredActivity,
};
use sea_orm::prelude::Uuid;

use crate::activity::model::{Activity, ActivityInput, ActivityPatch};
use crate::activity::repository::Repository;
use crate::crop_cycle;
use crate::error::AppError;
use crate::platform::clock::today_in_kenya;

/// One page of a cycle's activities with the count and season total.
#[derive(Debug, Clone, PartialEq)]
pub struct ActivityPage {
    /// This page's activities, newest first.
    pub activities: Vec<Activity>,
    /// Activities in the cycle, across all pages.
    pub total: u64,
    /// Sum of every activity's cost in the cycle, whole KES.
    pub total_cost_kes: i64,
}

/// Activity use cases. Built once in `AppState::new`.
#[derive(Debug, Clone)]
pub struct Service {
    repo: Repository,
    // Ownership of an activity goes through its cycle, so this service also
    // reads cycles (like the farm service reads plots).
    cycles: crop_cycle::Repository,
}

impl Service {
    /// Wires the service to its repositories.
    #[must_use]
    pub fn new(repo: Repository, cycles: crop_cycle::Repository) -> Self {
        Self { repo, cycles }
    }

    /// One page of one of `owner`'s cycles' activities.
    ///
    /// # Errors
    /// 404 when the cycle does not exist or is not `owner`'s; 500 on a database failure.
    pub async fn list(
        &self,
        owner: &str,
        cycle_id: Uuid,
        offset: u64,
        limit: u64,
    ) -> Result<ActivityPage, AppError> {
        if self.cycles.find_model(owner, cycle_id).await?.is_none() {
            return Err(AppError::NotFound("crop cycle"));
        }
        let totals = self.cycles.totals(cycle_id).await?;
        let activities = self.repo.list(cycle_id, offset, limit).await?;
        Ok(ActivityPage {
            activities,
            total: totals.activity_count.unsigned_abs(),
            total_cost_kes: totals.season_cost_kes,
        })
    }

    /// Logs an activity on one of `owner`'s cycles.
    ///
    /// The cycle is read first because the `doneOn` rule needs its planting
    /// date; then every field is checked together.
    ///
    /// # Errors
    /// 404 when the cycle does not exist or is not `owner`'s; 422 listing
    /// every refused field; 500 on a database failure.
    pub async fn create(
        &self,
        owner: &str,
        cycle_id: Uuid,
        input: &ActivityInput,
    ) -> Result<Activity, AppError> {
        let cycle = self
            .cycles
            .find_model(owner, cycle_id)
            .await?
            .ok_or(AppError::NotFound("crop cycle"))?;
        let fields = ActivityFields {
            kind: &input.kind,
            done_on: Some(input.done_on),
            input: input.input.as_deref(),
            quantity: input.quantity,
            quantity_unit: input.quantity_unit.as_deref(),
            cost_kes: input.cost_kes,
            notes: input.notes.as_deref(),
        };
        let activity = NewActivity::parse(&fields, cycle.planted_on, today_in_kenya())?;
        self.repo
            .create(cycle_id, &activity)
            .await?
            .ok_or(AppError::NotFound("crop cycle"))
    }

    /// Changes the sent fields of one of `owner`'s activities.
    ///
    /// # Errors
    /// 404 when the activity does not exist or is not `owner`'s; 422 listing
    /// every refused field; 500 on a database failure.
    pub async fn update(
        &self,
        owner: &str,
        id: Uuid,
        patch: &ActivityPatch,
    ) -> Result<Activity, AppError> {
        let (model, planted_on) = self
            .repo
            .find_owned(owner, id)
            .await?
            .ok_or(AppError::NotFound("activity"))?;
        let fields = ActivityPatchFields {
            kind: patch.kind.as_deref(),
            done_on: patch.done_on,
            // Option<Option<String>> → Option<Option<&str>>: borrow both layers.
            input: patch.input.as_ref().map(Option::as_deref),
            quantity: patch.quantity,
            quantity_unit: patch.quantity_unit.as_ref().map(Option::as_deref),
            cost_kes: patch.cost_kes,
            notes: patch.notes.as_ref().map(Option::as_deref),
        };
        let stored = StoredActivity {
            has_quantity: model.quantity_hundredths.is_some(),
            has_unit: model.quantity_unit.is_some(),
        };
        let changes = ActivityChanges::parse(&fields, stored, planted_on, today_in_kenya())?;
        self.repo
            .update(model, &changes)
            .await?
            .ok_or(AppError::NotFound("activity"))
    }

    /// Deletes one of `owner`'s activities.
    ///
    /// # Errors
    /// 404 when the activity does not exist or is not `owner`'s; 500 on a database failure.
    pub async fn delete(&self, owner: &str, id: Uuid) -> Result<(), AppError> {
        if self.repo.delete(owner, id).await? {
            Ok(())
        } else {
            Err(AppError::NotFound("activity"))
        }
    }
}
