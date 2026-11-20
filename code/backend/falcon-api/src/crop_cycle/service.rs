//! Crop-cycle business logic (template §5.2). Every rule comes from
//! `falcon-core`; this layer orders the steps, supplies "today" (Kenya time)
//! and the counts the rules need, and turns "not found" into a 404.

use falcon_core::calendar;
use falcon_core::crop::Crop;
use falcon_core::crop_cycle::{self, CropCycleChanges, CycleStatus, NewCropCycle};
use sea_orm::prelude::Uuid;

use crate::crop_cycle::model::{
    CropCycle, CropCycleDetail, CropCycleInput, CropCyclePatch, StatusFilter,
};
use crate::crop_cycle::repository::Repository;
use crate::error::AppError;
use crate::platform::clock::today_in_kenya;

/// Crop-cycle use cases. Built once in `AppState::new`.
#[derive(Debug, Clone)]
pub struct Service {
    repo: Repository,
}

impl Service {
    /// Wires the service to its repository.
    #[must_use]
    pub fn new(repo: Repository) -> Self {
        Self { repo }
    }

    /// One page of `owner`'s cycles across all their plots, and the total.
    ///
    /// # Errors
    /// 500 on a database failure.
    pub async fn list(
        &self,
        owner: &str,
        status: Option<StatusFilter>,
        offset: u64,
        limit: u64,
    ) -> Result<(Vec<CropCycle>, u64), AppError> {
        self.repo.list(owner, status, offset, limit).await
    }

    /// Every cycle of one of `owner`'s plots, newest planting first.
    ///
    /// # Errors
    /// 404 when the plot does not exist or is not `owner`'s; 500 on a database failure.
    pub async fn list_for_plot(
        &self,
        owner: &str,
        plot_id: Uuid,
    ) -> Result<Vec<CropCycle>, AppError> {
        if !self.repo.plot_is_owned(owner, plot_id).await? {
            return Err(AppError::NotFound("plot"));
        }
        self.repo.list_for_plot(owner, plot_id).await
    }

    /// Starts a crop on one of `owner`'s plots.
    ///
    /// The input is checked before the database is touched. Then: the plot
    /// must be `owner`'s (404), and it must have no open cycle (409).
    ///
    /// # Errors
    /// 422 listing every refused field; 404 when the plot does not exist or
    /// is not `owner`'s; 409 `OPEN_CYCLE_EXISTS`; 500 on a database failure.
    pub async fn create(
        &self,
        owner: &str,
        plot_id: Uuid,
        input: &CropCycleInput,
    ) -> Result<CropCycle, AppError> {
        let cycle = NewCropCycle::parse(
            &input.crop,
            input.custom_crop.as_deref(),
            input.variety.as_deref(),
            input.planted_on,
            today_in_kenya(),
        )?;
        if !self.repo.plot_is_owned(owner, plot_id).await? {
            return Err(AppError::NotFound("plot"));
        }
        // The rule lives in falcon-core; the count comes from the database.
        // The repository maps the unique-index refusal to the same 409, for a
        // cycle added between this check and the insert.
        crop_cycle::ensure_no_open_cycle(self.repo.count_open(plot_id).await?)?;
        self.repo
            .create(owner, plot_id, &cycle)
            .await?
            .ok_or(AppError::NotFound("plot"))
    }

    /// One of `owner`'s cycles with its season totals and calendar.
    ///
    /// # Errors
    /// 404 when the cycle does not exist or is not `owner`'s; 500 on a database failure.
    pub async fn get(&self, owner: &str, id: Uuid) -> Result<CropCycleDetail, AppError> {
        let cycle = self
            .repo
            .find(owner, id)
            .await?
            .ok_or(AppError::NotFound("crop cycle"))?;
        let totals = self.repo.totals(id).await?;
        // `and_then` chains two "maybe" steps: an unknown stored slug (never
        // expected) or a crop without a sourced calendar both give null.
        let calendar = Crop::from_slug(&cycle.crop)
            .and_then(|crop| calendar::for_crop(crop, cycle.planted_on, today_in_kenya()));
        Ok(CropCycleDetail {
            cycle,
            season_cost_kes: totals.season_cost_kes,
            // A count is never negative; `unsigned_abs` converts without a cast.
            activity_count: totals.activity_count.unsigned_abs(),
            calendar,
        })
    }

    /// Changes the sent fields of one of `owner`'s cycles. A status change
    /// must move forward.
    ///
    /// # Errors
    /// 422 listing every refused field; 404 when the cycle does not exist or
    /// is not `owner`'s; 409 `STATUS_BACKWARDS`; 500 on a database failure.
    pub async fn update(
        &self,
        owner: &str,
        id: Uuid,
        patch: &CropCyclePatch,
    ) -> Result<CropCycle, AppError> {
        let changes = CropCycleChanges::parse(
            // Option<Option<String>> → Option<Option<&str>>: borrow both layers.
            patch.variety.as_ref().map(Option::as_deref),
            patch.planted_on,
            patch.status.as_deref(),
            today_in_kenya(),
        )?;
        let model = self
            .repo
            .find_model(owner, id)
            .await?
            .ok_or(AppError::NotFound("crop cycle"))?;
        if let Some(next) = changes.status() {
            // A stored status falcon-core does not know would be a bug; refuse
            // the move rather than guess.
            let current = CycleStatus::from_slug(&model.status)
                .ok_or_else(|| anyhow::anyhow!("unknown stored cycle status"))?;
            current.ensure_can_move_to(next)?;
        }
        self.repo
            .update(owner, model, &changes)
            .await?
            .ok_or(AppError::NotFound("crop cycle"))
    }
}
