//! Farm business logic (template §5.2). Every rule comes from `falcon-core`;
//! this layer orders the steps and turns "not found" into a 404.

use falcon_core::farm::{self, FarmChanges, NewFarm};
use sea_orm::prelude::Uuid;

use crate::error::AppError;
use crate::farm::model::{Farm, FarmDetail, FarmInput, FarmPatch};
use crate::farm::repository::Repository;
use crate::plot;

/// Farm use cases. Built once in `AppState::new`.
#[derive(Debug, Clone)]
pub struct Service {
    repo: Repository,
    // The farm detail lists the farm's plots, so this service also reads plots.
    plots: plot::Repository,
}

impl Service {
    /// Wires the service to its repositories.
    #[must_use]
    pub fn new(repo: Repository, plots: plot::Repository) -> Self {
        Self { repo, plots }
    }

    /// One page of `owner`'s farms and the total count.
    ///
    /// # Errors
    /// 500 on a database failure.
    pub async fn list(
        &self,
        owner: &str,
        offset: u64,
        limit: u64,
    ) -> Result<(Vec<Farm>, u64), AppError> {
        self.repo.list(owner, offset, limit).await
    }

    /// One of `owner`'s farms with all its plots.
    ///
    /// # Errors
    /// 404 when the farm does not exist or is not `owner`'s; 500 on a database failure.
    pub async fn get(&self, owner: &str, id: Uuid) -> Result<FarmDetail, AppError> {
        let farm = self
            .repo
            .find(owner, id)
            .await?
            .ok_or(AppError::NotFound("farm"))?;
        let plots = self.plots.list_for_farm(owner, id).await?;
        Ok(FarmDetail { farm, plots })
    }

    /// Adds a farm for `owner`.
    ///
    /// # Errors
    /// 422 [`AppError::Domain`] listing every refused field; 500 on a database failure.
    pub async fn create(&self, owner: &str, input: &FarmInput) -> Result<Farm, AppError> {
        // `?` converts the CoreError into AppError::Domain via its `From` impl.
        let farm = NewFarm::parse(&input.name, &input.county, input.locality.as_deref())?;
        self.repo.create(owner, &farm).await
    }

    /// Changes the sent fields of one of `owner`'s farms.
    ///
    /// # Errors
    /// 422 listing every refused field; 404 when the farm does not exist or
    /// is not `owner`'s; 500 on a database failure.
    pub async fn update(&self, owner: &str, id: Uuid, patch: &FarmPatch) -> Result<Farm, AppError> {
        let changes = FarmChanges::parse(
            patch.name.as_deref(),
            patch.county.as_deref(),
            // Option<Option<String>> → Option<Option<&str>>: borrow both layers.
            patch.locality.as_ref().map(Option::as_deref),
        )?;
        self.repo
            .update(owner, id, &changes)
            .await?
            .ok_or(AppError::NotFound("farm"))
    }

    /// Deletes one of `owner`'s farms, if it has no plots.
    ///
    /// # Errors
    /// 404 when the farm does not exist or is not `owner`'s; 409
    /// `FARM_HAS_PLOTS` while it has plots; 500 on a database failure.
    pub async fn delete(&self, owner: &str, id: Uuid) -> Result<(), AppError> {
        let found = self
            .repo
            .find(owner, id)
            .await?
            .ok_or(AppError::NotFound("farm"))?;
        farm::ensure_deletable(found.plot_count)?;
        // The repository maps the foreign-key refusal to the same 409, for a
        // plot added between the check above and this delete.
        if self.repo.delete(owner, id).await? {
            Ok(())
        } else {
            Err(AppError::NotFound("farm"))
        }
    }
}
