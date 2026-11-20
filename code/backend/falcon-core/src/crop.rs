//! The crop catalogue: every crop a farmer can choose for a crop cycle.
//!
//! VISION.md (Matt, 2026-11-19): farm records work for many crops, starting
//! with the grant proposal's list, plus any crop the farmer names (`other`,
//! with `customCrop`). Two things are switched on per crop, separately:
//!
//! - **calendar**: only where the timings come from a published reference
//!   (see `calendar_data.rs`). Every catalogue crop has one since
//!   2026-11-19 (approved by Matt, `reviewed: false` until an agronomist
//!   checks it); `Other` never does.
//! - **health check**: the crop-health assessment, maize and beans only for
//!   the pilot.
//!
//! # Adding a crop
//!
//! One enum variant in [`Crop`] plus one row in [`CATALOGUE`]. The tests
//! will not compile until the new variant is also listed in their
//! `all_variants`, and then fail if its catalogue row is missing. Then add
//! the slug to `CropSlug` in `api/openapi.yaml`.

use serde::{Serialize, Serializer};

use crate::calendar_data;
use crate::error::{FieldIssue, IssueCode};

/// A crop from the catalogue, or [`Crop::Other`] for one the farmer names.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Crop {
    /// `maize`
    Maize,
    /// `sorghum`
    Sorghum,
    /// `finger_millet`
    FingerMillet,
    /// `pearl_millet`
    PearlMillet,
    /// `rice`
    Rice,
    /// `beans`
    Beans,
    /// `green_grams`
    GreenGrams,
    /// `cowpeas`
    Cowpeas,
    /// `pigeon_peas`
    PigeonPeas,
    /// `cassava`
    Cassava,
    /// `irish_potatoes`
    IrishPotatoes,
    /// `sweet_potatoes`
    SweetPotatoes,
    /// `bananas`
    Bananas,
    /// `other`: a crop the farmer names in `customCrop`.
    Other,
}

/// One catalogue row: the crop, its wire slug, and whether crop-health
/// checks cover it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CropInfo {
    /// The crop.
    pub crop: Crop,
    /// Its lowercase slug, the only form stored and sent over the wire.
    pub slug: &'static str,
    /// True when crop-health checks will cover this crop (pilot: maize and beans).
    pub health_check: bool,
}

/// The catalogue, in the order of `CropSlug` in `api/openapi.yaml`.
///
/// A `const` array of plain structs is the Rust stand-in for a frozen
/// lookup table: it is built at compile time and costs nothing at run time.
pub const CATALOGUE: &[CropInfo] = &[
    info(Crop::Maize, "maize", true),
    info(Crop::Sorghum, "sorghum", false),
    info(Crop::FingerMillet, "finger_millet", false),
    info(Crop::PearlMillet, "pearl_millet", false),
    info(Crop::Rice, "rice", false),
    info(Crop::Beans, "beans", true),
    info(Crop::GreenGrams, "green_grams", false),
    info(Crop::Cowpeas, "cowpeas", false),
    info(Crop::PigeonPeas, "pigeon_peas", false),
    info(Crop::Cassava, "cassava", false),
    info(Crop::IrishPotatoes, "irish_potatoes", false),
    info(Crop::SweetPotatoes, "sweet_potatoes", false),
    info(Crop::Bananas, "bananas", false),
    info(Crop::Other, "other", false),
];

// `const fn` can run at compile time, which is what lets `CATALOGUE` above
// be a `const` built from function calls.
const fn info(crop: Crop, slug: &'static str, health_check: bool) -> CropInfo {
    CropInfo {
        crop,
        slug,
        health_check,
    }
}

impl Crop {
    /// This crop's catalogue row.
    #[must_use]
    pub fn info(self) -> CropInfo {
        // Every variant has a row (a test proves it), so the fallback is
        // never used; it exists because `find` cannot know that.
        CATALOGUE
            .iter()
            .copied()
            .find(|row| row.crop == self)
            .unwrap_or(CropInfo {
                crop: self,
                slug: "other",
                health_check: false,
            })
    }

    /// The crop's slug, e.g. `finger_millet`.
    #[must_use]
    pub fn as_str(self) -> &'static str {
        self.info().slug
    }

    /// Parses a slug. Exact match only (`Maize` is refused).
    #[must_use]
    pub fn from_slug(slug: &str) -> Option<Self> {
        CATALOGUE.iter().find(|row| row.slug == slug).map(|row| row.crop)
    }

    /// Parses the `crop` input field.
    ///
    /// # Errors
    /// `crop: invalid_choice` for anything that is not a catalogue slug.
    pub fn parse_field(slug: &str) -> Result<Self, FieldIssue> {
        Self::from_slug(slug).ok_or_else(|| FieldIssue::new("crop", IssueCode::InvalidChoice))
    }

    /// True when crop-health checks cover this crop (maize and beans).
    #[must_use]
    pub fn health_check(self) -> bool {
        self.info().health_check
    }

    /// True when this crop has a crop calendar from a published reference.
    #[must_use]
    pub fn has_calendar(self) -> bool {
        calendar_data::table_for(self).is_some()
    }
}

/// Serialises as the slug, like `County`.
impl Serialize for Crop {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_str())
    }
}

/// One entry of `GET /api/v1/crops` (`CatalogueCrop` in the contract).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogueCrop {
    /// The crop slug.
    pub crop: Crop,
    /// True when the crop's growth stages come from a published reference.
    pub has_calendar: bool,
    /// True when crop-health checks cover this crop.
    pub health_check: bool,
}

/// The whole catalogue as clients see it, in catalogue order.
#[must_use]
pub fn catalogue() -> Vec<CatalogueCrop> {
    CATALOGUE
        .iter()
        .map(|row| CatalogueCrop {
            crop: row.crop,
            has_calendar: row.crop.has_calendar(),
            health_check: row.health_check,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Lists every variant. The `match` has no `_` arm on purpose: adding a
    /// variant to `Crop` breaks the test build here until it is added to the
    /// match (and to `every`), and the tests then check it has a catalogue row.
    fn all_variants() -> Vec<Crop> {
        let every = [
            Crop::Maize,
            Crop::Sorghum,
            Crop::FingerMillet,
            Crop::PearlMillet,
            Crop::Rice,
            Crop::Beans,
            Crop::GreenGrams,
            Crop::Cowpeas,
            Crop::PigeonPeas,
            Crop::Cassava,
            Crop::IrishPotatoes,
            Crop::SweetPotatoes,
            Crop::Bananas,
            Crop::Other,
        ];
        for crop in every {
            match crop {
                Crop::Maize
                | Crop::Sorghum
                | Crop::FingerMillet
                | Crop::PearlMillet
                | Crop::Rice
                | Crop::Beans
                | Crop::GreenGrams
                | Crop::Cowpeas
                | Crop::PigeonPeas
                | Crop::Cassava
                | Crop::IrishPotatoes
                | Crop::SweetPotatoes
                | Crop::Bananas
                | Crop::Other => {}
            }
        }
        every.to_vec()
    }

    #[test]
    fn every_crop_is_in_the_catalogue_once() {
        for crop in all_variants() {
            let rows = CATALOGUE.iter().filter(|row| row.crop == crop).count();
            assert_eq!(rows, 1, "{crop:?}");
        }
        assert_eq!(CATALOGUE.len(), all_variants().len());
    }

    #[test]
    fn slugs_match_the_api_contract() {
        // Copied from `CropSlug` in api/openapi.yaml.
        let contract = "maize, sorghum, finger_millet, pearl_millet, rice, beans, green_grams, \
            cowpeas, pigeon_peas, cassava, irish_potatoes, sweet_potatoes, bananas, other";
        let expected: Vec<&str> = contract.split(',').map(str::trim).collect();
        let actual: Vec<&str> = CATALOGUE.iter().map(|row| row.slug).collect();
        assert_eq!(actual, expected);
    }

    #[test]
    fn every_slug_round_trips() {
        for crop in all_variants() {
            assert_eq!(Crop::from_slug(crop.as_str()), Some(crop));
            assert_eq!(Crop::parse_field(crop.as_str()), Ok(crop));
        }
    }

    #[test]
    fn anything_else_is_an_invalid_choice() {
        for input in ["", "Maize", "MAIZE", " maize", "maize ", "millet", "green-grams", "corn"] {
            assert_eq!(Crop::from_slug(input), None, "input {input:?}");
            assert_eq!(
                Crop::parse_field(input),
                Err(FieldIssue::new("crop", IssueCode::InvalidChoice)),
                "input {input:?}"
            );
        }
    }

    #[test]
    fn health_checks_cover_only_maize_and_beans() {
        let covered: Vec<Crop> = all_variants()
            .into_iter()
            .filter(|c| c.health_check())
            .collect();
        assert_eq!(covered, [Crop::Maize, Crop::Beans]);
    }

    #[test]
    fn every_catalogue_crop_has_a_calendar_except_other() {
        for crop in all_variants() {
            assert_eq!(crop.has_calendar(), crop != Crop::Other, "{crop:?}");
        }
    }

    #[test]
    fn catalogue_lists_every_crop_with_its_flags() {
        let list = catalogue();
        assert_eq!(list.len(), CATALOGUE.len());
        assert_eq!(
            list[0],
            CatalogueCrop {
                crop: Crop::Maize,
                has_calendar: true,
                health_check: true,
            }
        );
        assert_eq!(list.last().map(|c| c.crop), Some(Crop::Other));
    }
}
