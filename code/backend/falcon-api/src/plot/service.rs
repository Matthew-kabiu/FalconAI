//! Plot business logic (template §5.2). Every rule comes from `falcon-core`;
//! this layer orders the steps and turns "not found" into a 404.

use falcon_core::plot::{self, NewPlot, PlotChanges};
use sea_orm::prelude::Uuid;

use crate::error::AppError;
use crate::plot::model::{Plot, PlotInput, PlotPatch};
use crate::plot::repository::Repository;

/// Plot use cases. Built once in `AppState::new`.
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

    /// Adds a plot to one of `owner`'s farms.
    ///
    /// The input is checked before the database is touched, so a bad request
    /// never costs a query.
    ///
    /// # Errors
    /// 422 [`AppError::Domain`] listing every refused field; 404 when the farm
    /// does not exist or is not `owner`'s; 500 on a database failure.
    pub async fn create(
        &self,
        owner: &str,
        farm_id: Uuid,
        input: &PlotInput,
    ) -> Result<Plot, AppError> {
        let plot = NewPlot::parse(
            &input.name,
            input.size,
            &input.size_unit,
            input.notes.as_deref(),
        )?;
        self.repo
            .create(owner, farm_id, &plot)
            .await?
            .ok_or(AppError::NotFound("farm"))
    }

    /// Changes the sent fields of one of `owner`'s plots.
    ///
    /// # Errors
    /// 422 listing every refused field; 404 when the plot does not exist or
    /// is not `owner`'s; 500 on a database failure.
    pub async fn update(&self, owner: &str, id: Uuid, patch: &PlotPatch) -> Result<Plot, AppError> {
        let changes = PlotChanges::parse(
            patch.name.as_deref(),
            patch.size,
            patch.size_unit.as_deref(),
            // Option<Option<String>> → Option<Option<&str>>: borrow both layers.
            patch.notes.as_ref().map(Option::as_deref),
        )?;
        self.repo
            .update(owner, id, &changes)
            .await?
            .ok_or(AppError::NotFound("plot"))
    }

    /// Deletes one of `owner`'s plots, if it has no crop cycles.
    ///
    /// # Errors
    /// 404 when the plot does not exist or is not `owner`'s; 409
    /// `PLOT_HAS_CROPS` while it has crop cycles; 500 on a database failure.
    pub async fn delete(&self, owner: &str, id: Uuid) -> Result<(), AppError> {
        let cycles = self
            .repo
            .crop_cycle_count(owner, id)
            .await?
            .ok_or(AppError::NotFound("plot"))?;
        plot::ensure_deletable(cycles)?;
        // The repository maps the foreign-key refusal to the same 409, for a
        // cycle added between the check above and this delete.
        if self.repo.delete(owner, id).await? {
            Ok(())
        } else {
            Err(AppError::NotFound("plot"))
        }
    }
}
