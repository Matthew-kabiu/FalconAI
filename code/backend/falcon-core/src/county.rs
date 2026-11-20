//! Kenya's 47 counties, as lowercase slugs (`kiambu`, `homa-bay`).
//!
//! The slug is the only form stored and sent over the wire. Display names
//! ("Homa Bay", "Murang'a") live in the clients, so they can be translated.

use serde::{Serialize, Serializer};

use crate::error::{FieldIssue, IssueCode};

/// One of Kenya's 47 counties.
///
/// The variants are listed in slug order, the same order as `County` in
/// `api/openapi.yaml`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum County {
    /// `baringo`
    Baringo,
    /// `bomet`
    Bomet,
    /// `bungoma`
    Bungoma,
    /// `busia`
    Busia,
    /// `elgeyo-marakwet`
    ElgeyoMarakwet,
    /// `embu`
    Embu,
    /// `garissa`
    Garissa,
    /// `homa-bay`
    HomaBay,
    /// `isiolo`
    Isiolo,
    /// `kajiado`
    Kajiado,
    /// `kakamega`
    Kakamega,
    /// `kericho`
    Kericho,
    /// `kiambu`
    Kiambu,
    /// `kilifi`
    Kilifi,
    /// `kirinyaga`
    Kirinyaga,
    /// `kisii`
    Kisii,
    /// `kisumu`
    Kisumu,
    /// `kitui`
    Kitui,
    /// `kwale`
    Kwale,
    /// `laikipia`
    Laikipia,
    /// `lamu`
    Lamu,
    /// `machakos`
    Machakos,
    /// `makueni`
    Makueni,
    /// `mandera`
    Mandera,
    /// `marsabit`
    Marsabit,
    /// `meru`
    Meru,
    /// `migori`
    Migori,
    /// `mombasa`
    Mombasa,
    /// `muranga`
    Muranga,
    /// `nairobi`
    Nairobi,
    /// `nakuru`
    Nakuru,
    /// `nandi`
    Nandi,
    /// `narok`
    Narok,
    /// `nyamira`
    Nyamira,
    /// `nyandarua`
    Nyandarua,
    /// `nyeri`
    Nyeri,
    /// `samburu`
    Samburu,
    /// `siaya`
    Siaya,
    /// `taita-taveta`
    TaitaTaveta,
    /// `tana-river`
    TanaRiver,
    /// `tharaka-nithi`
    TharakaNithi,
    /// `trans-nzoia`
    TransNzoia,
    /// `turkana`
    Turkana,
    /// `uasin-gishu`
    UasinGishu,
    /// `vihiga`
    Vihiga,
    /// `wajir`
    Wajir,
    /// `west-pokot`
    WestPokot,
}

impl County {
    /// Every county, in slug order. Rust enums cannot be iterated by
    /// themselves (there is no `Object.values(Enum)`), so the list is spelled out.
    pub const ALL: [Self; 47] = [
        Self::Baringo,
        Self::Bomet,
        Self::Bungoma,
        Self::Busia,
        Self::ElgeyoMarakwet,
        Self::Embu,
        Self::Garissa,
        Self::HomaBay,
        Self::Isiolo,
        Self::Kajiado,
        Self::Kakamega,
        Self::Kericho,
        Self::Kiambu,
        Self::Kilifi,
        Self::Kirinyaga,
        Self::Kisii,
        Self::Kisumu,
        Self::Kitui,
        Self::Kwale,
        Self::Laikipia,
        Self::Lamu,
        Self::Machakos,
        Self::Makueni,
        Self::Mandera,
        Self::Marsabit,
        Self::Meru,
        Self::Migori,
        Self::Mombasa,
        Self::Muranga,
        Self::Nairobi,
        Self::Nakuru,
        Self::Nandi,
        Self::Narok,
        Self::Nyamira,
        Self::Nyandarua,
        Self::Nyeri,
        Self::Samburu,
        Self::Siaya,
        Self::TaitaTaveta,
        Self::TanaRiver,
        Self::TharakaNithi,
        Self::TransNzoia,
        Self::Turkana,
        Self::UasinGishu,
        Self::Vihiga,
        Self::Wajir,
        Self::WestPokot,
    ];

    /// The county's slug, e.g. `homa-bay`.
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Baringo => "baringo",
            Self::Bomet => "bomet",
            Self::Bungoma => "bungoma",
            Self::Busia => "busia",
            Self::ElgeyoMarakwet => "elgeyo-marakwet",
            Self::Embu => "embu",
            Self::Garissa => "garissa",
            Self::HomaBay => "homa-bay",
            Self::Isiolo => "isiolo",
            Self::Kajiado => "kajiado",
            Self::Kakamega => "kakamega",
            Self::Kericho => "kericho",
            Self::Kiambu => "kiambu",
            Self::Kilifi => "kilifi",
            Self::Kirinyaga => "kirinyaga",
            Self::Kisii => "kisii",
            Self::Kisumu => "kisumu",
            Self::Kitui => "kitui",
            Self::Kwale => "kwale",
            Self::Laikipia => "laikipia",
            Self::Lamu => "lamu",
            Self::Machakos => "machakos",
            Self::Makueni => "makueni",
            Self::Mandera => "mandera",
            Self::Marsabit => "marsabit",
            Self::Meru => "meru",
            Self::Migori => "migori",
            Self::Mombasa => "mombasa",
            Self::Muranga => "muranga",
            Self::Nairobi => "nairobi",
            Self::Nakuru => "nakuru",
            Self::Nandi => "nandi",
            Self::Narok => "narok",
            Self::Nyamira => "nyamira",
            Self::Nyandarua => "nyandarua",
            Self::Nyeri => "nyeri",
            Self::Samburu => "samburu",
            Self::Siaya => "siaya",
            Self::TaitaTaveta => "taita-taveta",
            Self::TanaRiver => "tana-river",
            Self::TharakaNithi => "tharaka-nithi",
            Self::TransNzoia => "trans-nzoia",
            Self::Turkana => "turkana",
            Self::UasinGishu => "uasin-gishu",
            Self::Vihiga => "vihiga",
            Self::Wajir => "wajir",
            Self::WestPokot => "west-pokot",
        }
    }

    /// Parses a slug. Exact match only: `Kiambu` or ` kiambu` is refused, so
    /// what is stored is always one of the 47 slugs.
    ///
    /// Returns `None` for anything else; [`County::parse_field`] turns that
    /// into a field issue.
    #[must_use]
    pub fn from_slug(slug: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|c| c.as_str() == slug)
    }

    /// Parses the `county` input field.
    ///
    /// # Errors
    /// `county: invalid_choice` for anything that is not one of the 47 slugs.
    pub fn parse_field(slug: &str) -> Result<Self, FieldIssue> {
        Self::from_slug(slug).ok_or_else(|| FieldIssue::new("county", IssueCode::InvalidChoice))
    }
}

/// Serialises as the slug. Written by hand (instead of
/// `#[derive(Serialize)]` + `rename_all`) so `as_str` is the single source of
/// the wire names: `rename_all = "kebab-case"` would get `muranga` right only
/// by luck of how the variant is spelled.
impl Serialize for County {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.as_str())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn there_are_47_distinct_slugs_in_order() {
        let slugs: Vec<&str> = County::ALL.iter().map(|c| c.as_str()).collect();
        assert_eq!(slugs.len(), 47);
        let mut sorted = slugs.clone();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(sorted, slugs, "ALL must be sorted and without duplicates");
    }

    #[test]
    fn slugs_match_the_api_contract() {
        // Copied from `County` in api/openapi.yaml.
        let contract = "baringo, bomet, bungoma, busia, elgeyo-marakwet, embu, garissa, \
            homa-bay, isiolo, kajiado, kakamega, kericho, kiambu, kilifi, kirinyaga, kisii, \
            kisumu, kitui, kwale, laikipia, lamu, machakos, makueni, mandera, marsabit, meru, \
            migori, mombasa, muranga, nairobi, nakuru, nandi, narok, nyamira, nyandarua, nyeri, \
            samburu, siaya, taita-taveta, tana-river, tharaka-nithi, trans-nzoia, turkana, \
            uasin-gishu, vihiga, wajir, west-pokot";
        let expected: Vec<&str> = contract.split(',').map(str::trim).collect();
        let actual: Vec<&str> = County::ALL.iter().map(|c| c.as_str()).collect();
        assert_eq!(actual, expected);
    }

    #[test]
    fn every_slug_round_trips() {
        for county in County::ALL {
            assert_eq!(County::from_slug(county.as_str()), Some(county));
            assert_eq!(County::parse_field(county.as_str()), Ok(county));
        }
    }

    #[test]
    fn anything_else_is_an_invalid_choice() {
        for input in [
            "",
            "Kiambu",
            "KIAMBU",
            " kiambu",
            "kiambu ",
            "homa_bay",
            "homabay",
            "Homa Bay",
            "murang'a",
            "nairobi-city",
            "kampala",
        ] {
            assert_eq!(County::from_slug(input), None, "input {input:?}");
            assert_eq!(
                County::parse_field(input),
                Err(FieldIssue::new("county", IssueCode::InvalidChoice)),
                "input {input:?}"
            );
        }
    }
}
