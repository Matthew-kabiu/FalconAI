//! Crop-calendar DATA: the one place stage and task timings live.
//!
//! VISION.md: a calendar is shown only where its timings come from a
//! published Kenyan reference, marked for agricultural review. Every number
//! below comes from `docs/crop-calendar-sources.md` (approved by Matt,
//! 2026-11-19); the `[n]` citation numbers in the comments refer to that
//! file's Sources list. Do not add timings from memory or from an unsourced
//! page. Every table is `reviewed: false` until an agricultural professional
//! has checked it.
//!
//! How the numbers were turned into days (Matt's decision, 2026-11-19):
//!
//! - Day 0 is the planting day. 1 week = 7 days, 1 month = 30 days; each
//!   conversion is shown next to the number.
//! - Where sources give a range or disagree, the table uses the WIDEST range
//!   the cited sources support across Kenyan variety groups and zones, and
//!   the conflict is noted next to the numbers.
//! - Full calendars (all sourced stages and timed tasks): beans, Irish
//!   potatoes, sweet potatoes, pigeon peas (stages only), bananas (first crop
//!   only). Partial crops get only their sourced maturity range plus any task
//!   a Kenyan source times; no middle stages are interpolated.
//! - Tasks the sources time from EMERGENCE (or germination) are left out:
//!   the sources do not say how many days after planting emergence happens,
//!   so they cannot be placed on a planting-day calendar without guessing.
//! - `maturity` is the window in which the crop reaches maturity and can be
//!   harvested, across the varieties the sources list.
//!
//! # Dropping in an approved table (one crop at a time)
//!
//! 1. Write a `static` for the crop, with the citation and `reviewed: false`
//!    (true only once an agricultural professional has checked it):
//!
//!    ```text
//!    static MAIZE: CalendarTable = CalendarTable {
//!        source: "<publisher, title, year, page>",
//!        reviewed: false,
//!        stages: &[
//!            Span::new("emergence", <start day>, <end day>),
//!            // … in start_day order; day 0 is the planting day
//!        ],
//!        tasks: &[
//!            Span::new("first_weeding", <start day>, <end day>),
//!            // … field tasks only, never a chemical dose
//!        ],
//!    };
//!    ```
//!
//! 2. Add one row to [`TABLES`]: `(Crop::Maize, &MAIZE)`.
//!
//! That is all: `GET /api/v1/crops` then reports `hasCalendar: true` for that
//! crop and its cycles get a calendar. The tests below check every table is
//! well formed and that `other` never gets one. Add the new stage and task
//! keys to the clients' dictionaries (English and Kiswahili).

use crate::calendar::{CalendarTable, Span};
use crate::crop::Crop;

// ---------------------------------------------------------------------------
// PARTIAL crops: sourced maturity range, plus Kenyan-sourced timed tasks.
// ---------------------------------------------------------------------------

/// Maize. Sources: [1] KALRO Maize TIMPs Vol. 1 (2022) pp.11, 15, 30, 57,
/// 196, 203–204, 278, 289, 338; [2] KALRO TIMPs portal, maize.
static MAIZE: CalendarTable = CalendarTable {
    source: "KALRO Maize TIMPs Vol. 1 (2022); KALRO TIMPs portal: maize",
    reviewed: false,
    stages: &[
        // maturity: earliest = KCB 85–95 days (dryland mid-altitude) [1] p.57.
        // Latest = "commercial highland varieties take up to 13 months" in the
        // very cold highlands (2200–3000 m) [1] p.203–204: 13 × 30 = 390.
        // Conflict: HAC is 140–160 days [1] p.204, but the same page says HAC
        // "takes 7–8 months" (= 210–240 days). Other highland hybrids run to
        // 160–185 days (H6210) [1] p.278. Widest supported range: 85–390.
        Span::new("maturity", 85, 390),
    ],
    tasks: &[
        // first_weeding: "most effective at 2–3 weeks after sowing" [2]:
        // 2 × 7 = 14 to 3 × 7 = 21. ([1] p.330 counts "3 weeks after
        // emergence"; emergence day is not stated, so not converted.)
        Span::new("first_weeding", 14, 21),
        // top_dressing: conflict between the two KALRO wordings.
        // [1] p.338: "2–3 weeks after planting, when the crop is about 45 cm
        // high … optimum around the 8–10 leaf stage" = 14–21 days.
        // [2]: "knee high" (no day count). Only [1] gives days: 14–21.
        // Weed and thin before top-dressing [1] p.338; [2]. No amount given.
        Span::new("top_dressing", 14, 21),
        // second_weeding: "2 to 3 weeks later" than the first [2]:
        // earliest 14 + 14 = 28, latest 21 + 21 = 42. ([1] p.330: 3 weeks
        // after the first, inside this range.)
        Span::new("second_weeding", 28, 42),
    ],
};

/// Sorghum. Sources: [3] KALRO/KCSAP sorghum inventory (2019) pp.6, 11, 25,
/// 31, 42, 50, 57; [4] KALRO TIMPs portal, sorghum; [6] KEPHIS National Crop
/// Variety List 2024 p.138.
static SORGHUM: CalendarTable = CalendarTable {
    source: "KALRO sorghum TIMPs inventory (2019); KALRO TIMPs portal: sorghum; \
             KEPHIS National Crop Variety List 2024",
    reviewed: false,
    stages: &[
        // maturity: earliest = "75–90 days" (general) [4]. Latest = E6518
        // 8 months (8 × 30 = 240) at 1750–2300 m [6] p.138.
        // Conflicts: BJ28 is 110 days in [4] but 7 months (= 210) in [6];
        // Seredo is 3 months (= 90) in [3] p.25 but 4 months (= 120) in [6].
        // Widest supported range: 75–240.
        Span::new("maturity", 75, 240),
    ],
    // Weeding ("two weeks after germination") and thinning ("after 3 weeks")
    // [3] p.57 count from germination, whose day is not stated; second
    // weeding and top-dressing are "just before flowering" [4], which has no
    // day count. None can be dated from planting.
    tasks: &[],
};

/// Finger millet. Sources: [5] KALRO TIMPs portal, finger millet; [6] KEPHIS
/// National Crop Variety List 2024 p.132.
static FINGER_MILLET: CalendarTable = CalendarTable {
    source: "KALRO TIMPs portal: finger millet; KEPHIS National Crop Variety List 2024",
    reviewed: false,
    stages: &[
        // maturity: earliest = EUFM-401 65–75 days [5]. Latest = Nakuru FM-1
        // 120–210 days [5]; [6] p.132 gives it 5–7 months (= 150–210), same
        // upper bound. Widest supported range: 65–210.
        Span::new("maturity", 65, 210),
    ],
    // Weeding, thinning and top-dressing [5] count from emergence (first
    // weeding 2 weeks after emergence), whose day is not stated.
    tasks: &[],
};

/// Pearl millet. Source: [6] KEPHIS National Crop Variety List 2024 p.137.
static PEARL_MILLET: CalendarTable = CalendarTable {
    source: "KEPHIS National Crop Variety List 2024",
    reviewed: false,
    stages: &[
        // maturity: Kat/PM 1 2–3 months; Kat/PM 2 and 3 2 months [6] p.137:
        // 2 × 30 = 60 to 3 × 30 = 90.
        Span::new("maturity", 60, 90),
    ],
    tasks: &[],
};

/// Rice. Source: [6] KEPHIS National Crop Variety List 2024 p.153 (Kenyan
/// maturity only). The stage and task timings in [19] (Uganda) and [20]
/// (IRRI, global) are deliberately NOT used: they are not Kenyan.
static RICE: CalendarTable = CalendarTable {
    source: "KEPHIS National Crop Variety List 2024",
    reviewed: false,
    stages: &[
        // maturity: earliest = NERICA 10 2–3 months (2 × 30 = 60). Latest =
        // NIBAM 108 5–6 months (6 × 30 = 180) [6] p.153. Basmati has no value
        // ("ND") in [6]. Widest supported range: 60–180.
        Span::new("maturity", 60, 180),
    ],
    tasks: &[],
};

/// Green grams. Sources: [8] KALRO TIMPs portal, green grams; [9] KALRO green
/// gram ToT manual (2020) PDF p.12; [6] KEPHIS National Crop Variety List
/// 2024 pp.187, 212.
static GREEN_GRAMS: CalendarTable = CalendarTable {
    source: "KALRO TIMPs portal: green grams; KALRO green gram ToT manual (2020); \
             KEPHIS National Crop Variety List 2024",
    reviewed: false,
    stages: &[
        // maturity: Ndengu Tosha 60–70 days … KS20, Kat N26, KAT N22 80–90
        // days, local types about 90 days [8]; "60–75 days" [9]; 2–3 months
        // (= 60–90) [6]. All agree within 60–90.
        Span::new("maturity", 60, 90),
    ],
    // "Second weeding before flowering" [8]: flowering has no day count.
    tasks: &[],
};

/// Cowpeas. Source: [6] KEPHIS National Crop Variety List 2024 p.184 (maturity
/// only). The flowering, leaf-picking and weeding timings in [21] are NOT
/// used: that guide's author and publisher are not stated.
static COWPEAS: CalendarTable = CalendarTable {
    source: "KEPHIS National Crop Variety List 2024",
    reviewed: false,
    stages: &[
        // maturity: earliest = MTW 2 months and most varieties 2–3 months
        // (2 × 30 = 60). Latest = Kunde vegetable type 4–5 months
        // (5 × 30 = 150) [6] p.184. Widest supported range: 60–150.
        Span::new("maturity", 60, 150),
    ],
    tasks: &[],
};

/// Cassava. Sources: [12] KALRO TIMPs portal, cassava; [6] KEPHIS National
/// Crop Variety List 2024 pp.24–25.
static CASSAVA: CalendarTable = CalendarTable {
    source: "KALRO TIMPs portal: cassava; KEPHIS National Crop Variety List 2024",
    reviewed: false,
    stages: &[
        // maturity: earliest = Nzalauka 6–8 months [6] p.24 and the portal's
        // "6–8" months [12] (6 × 30 = 180). Latest = "8–18 months" general
        // [12] and Kaleso 12–18 months [6] p.24 (18 × 30 = 540).
        // Widest supported range: 180–540.
        Span::new("maturity", 180, 540),
    ],
    tasks: &[
        // weed_control: needed "for the first three months of growth" [12]:
        // 0 to 3 × 30 = 90. (Weed "3 or more times", no dates given.)
        Span::new("weed_control", 0, 90),
        // gap_filling: replace cuttings not budded 2 weeks after planting
        // [12]: 2 × 7 = 14.
        Span::new("gap_filling", 14, 14),
        // stem_cutback (optional practice, "if used"): about 3 weeks before
        // harvest [12]. Harvest = maturity 180–540, so 180 − 21 = 159 to
        // 540 − 21 = 519.
        Span::new("stem_cutback", 159, 519),
    ],
};

// ---------------------------------------------------------------------------
// FULL calendars.
// ---------------------------------------------------------------------------

/// Common (dry) beans. Sources: [7] KALRO TIMPs portal, dry beans (citing the
/// KCEP-CRAL Common Dry Bean Extension Manual, 2021); [6] KEPHIS National
/// Crop Variety List 2024 p.167.
static BEANS: CalendarTable = CalendarTable {
    source: "KALRO TIMPs portal: dry beans; KEPHIS National Crop Variety List 2024",
    reviewed: false,
    stages: &[
        // vegetative: "3–4 weeks after planting" [7]: 3 × 7 = 21 to 4 × 7 = 28.
        Span::new("vegetative", 21, 28),
        // flowering (with early podding): "5–6 weeks after planting" [7]:
        // 5 × 7 = 35 to 6 × 7 = 42.
        Span::new("flowering", 35, 42),
        // maturity: bush beans 2–3 months [7] (GLPx92 2–3; others 2.5–3);
        // KEPHIS 2–4 months [6] p.167; climbing Kenya Mavuno (Mac 64) 3–5
        // months [7]. Widest supported: 2 × 30 = 60 to 5 × 30 = 150.
        // (Bush beans alone: 60–120.)
        Span::new("maturity", 60, 150),
    ],
    tasks: &[
        // gap_filling: "2 weeks after planting" [7]: 2 × 7 = 14.
        Span::new("gap_filling", 14, 14),
        // first_weeding: "one weeding 3 weeks after planting" [7]
        // (intercrop): 3 × 7 = 21. The pure-stand wording, "2–3 weeks after
        // emergence", counts from emergence (day not stated), so it is not
        // converted. Do not weed during flowering [7].
        Span::new("first_weeding", 21, 21),
        // Not placed (counted from emergence, day not stated): mulching 2–3
        // weeks after emergence; pure-stand second weeding 3 weeks after the
        // first; staking climbing beans 1–2 weeks after emergence [7].
    ],
};

/// Pigeon peas. Sources: [10] KALRO/KCSAP pigeon pea inventory (2019) pp.4,
/// 6, 9, 6–17; [11] KALRO TIMPs portal, pigeonpea; [6] KEPHIS National Crop
/// Variety List 2024 p.181. Stages only: the sources do not time the field
/// activities.
static PIGEON_PEAS: CalendarTable = CalendarTable {
    source: "KALRO pigeon pea TIMPs inventory (2019); KALRO TIMPs portal: pigeonpea; \
             KEPHIS National Crop Variety List 2024",
    reviewed: false,
    stages: &[
        // flowering: short KARI Mbaazi 1 55–70 days [10] p.4; medium KAT 60/8
        // 95–120 days [10] p.6; long KARI Mbaazi 2 "60–90 days" [10] p.9
        // (earlier than the medium variety; the research file asks a reviewer
        // to check it). Widest supported range: 55–120.
        Span::new("flowering", 55, 120),
        // maturity: earliest = KEPHIS 3 months (Mbaazi-1 3–4 months)
        // [6] p.181 (3 × 30 = 90). Latest = KARI Mbaazi 2 180–270 days
        // [10] p.9. ([10]/[11] give short 105–120, medium 110–175.)
        // Widest supported range: 90–270.
        Span::new("maturity", 90, 270),
    ],
    tasks: &[],
};

/// Irish potatoes. Sources: [13] APNI, Potato Production in Kenya (2021)
/// pp.10, 13, 14, 24 (Table 1 credited to NPCK 2015); [14] NPCK, Potato
/// Management Routine / Harvesting and Handling; [6] KEPHIS National Crop
/// Variety List 2024 p.27.
static IRISH_POTATOES: CalendarTable = CalendarTable {
    source: "APNI, Potato Production in Kenya (2021); NPCK potato management routine; \
             KEPHIS National Crop Variety List 2024",
    reviewed: false,
    stages: &[
        // vegetative (includes sprout development): stages 1–2 together take
        // "roughly 4 to 10 weeks" [13] p.24, so they end between 4 × 7 = 28
        // and 10 × 7 = 70 days. Widest: 0–70.
        // (Tuber set and tuber bulking have no start day in the sources, so
        // they are not placed.)
        Span::new("vegetative", 0, 70),
        // maturity: earliest = KEPHIS Kerr's Pink, Roslin Tana 2–3 months
        // (2 × 30 = 60) [6] p.27. Latest = Destiny, Kuroda 6 months
        // (6 × 30 = 180) [6]. NPCK table: 90–120 days or ">120 days"
        // [13] p.10. Widest supported range: 60–180.
        Span::new("maturity", 60, 180),
    ],
    tasks: &[
        // first_hilling and top_dressing: APNI [13] p.13 puts the first
        // top-dress "one month after planting (10–20 days after sprouts
        // emerge)" (1 × 30 = 30) and the first hilling at "about 10–20 days
        // after sprouts emerge", i.e. the same window by APNI's own
        // equivalence: day 30. (NPCK [14]: first weeding and hilling 2 weeks
        // after full emergence; counted from emergence, not converted.)
        Span::new("first_hilling", 30, 30),
        // Conflict: NPCK [14] says top-dress at flowering (no day count).
        // No amount given.
        Span::new("top_dressing", 30, 30),
        // second_hilling: "2–3 weeks later, at flower-bud formation"
        // [13] p.13: 30 + 14 = 44 to 30 + 21 = 51. (NPCK [14]: 2 weeks after
        // the first = 44, inside this range.)
        Span::new("second_hilling", 44, 51),
        // second_top_dressing: "at flower-bud formation" [13] p.13, the same
        // point as the second hilling: 44–51. No amount given.
        Span::new("second_top_dressing", 44, 51),
        // dehaulming (cut off the vines; stop irrigation): "2 weeks before
        // harvest" [13] p.14; [14]. Harvest = maturity 60–180, so
        // 60 − 14 = 46 to 180 − 14 = 166.
        Span::new("dehaulming", 46, 166),
    ],
};

/// Sweet potatoes. Sources: [15] CIP Sweetpotato ToT manual Topic 6 (2018)
/// pp.13–14 (East Africa, not Kenya-specific); [16] CIP ToT manual Vol. 5
/// (2013) p.250; [6] KEPHIS National Crop Variety List 2024 p.11.
/// CIP's week table starts at week 0, so week n = days 7n to 7n + 6.
static SWEET_POTATOES: CalendarTable = CalendarTable {
    source: "CIP Sweetpotato ToT manual (2018), East Africa; \
             KEPHIS National Crop Variety List 2024",
    reviewed: false,
    stages: &[
        // establishment: phase I, weeks 0–3 [15] p.14: days 0–27.
        Span::new("establishment", 0, 27),
        // root_initiation: storage roots begin "as early as two to three
        // weeks", on average 4–6 weeks after planting [15] p.13:
        // 2 × 7 = 14 to 6 × 7 = 42.
        Span::new("root_initiation", 14, 42),
        // vegetative (vine growth): phase II, weeks 4–7 [15] p.14: days 28–55.
        Span::new("vegetative", 28, 55),
        // root_bulking: phase III, "from week 8" [15] pp.13–14: 8 × 7 = 56.
        // No end is given; it runs to harvest, so it ends with the latest
        // maturity below (210).
        Span::new("root_bulking", 56, 210),
        // maturity: Kenyan varieties [6] p.11: earliest Kabode, Vitaa,
        // SPK 004, Kemb 10 3–5 months (3 × 30 = 90); latest Kenspot 1–5
        // 6–7 months at 1700–2300 m (7 × 30 = 210). [16] p.250 gives a
        // general (non-Kenyan) 3–8 months (= 90–240); the Kenyan range is
        // used. Widest Kenyan range: 90–210.
        Span::new("maturity", 90, 210),
    ],
    tasks: &[
        // weed_control: "keep weeds controlled for the first two months"
        // [15] p.14: 0 to 2 × 30 = 60.
        Span::new("weed_control", 0, 60),
        // gap_filling: week 1 [15] p.14: days 7–13.
        Span::new("gap_filling", 7, 13),
        // weeding: week 4, intermediate phase [15] p.14: days 28–34.
        Span::new("weeding", 28, 34),
        // vine_lifting: week 8 [15] p.14: days 56–62.
        Span::new("vine_lifting", 56, 62),
        // hilling: "around week 11" [15] p.14: days 77–83.
        Span::new("hilling", 77, 83),
    ],
};

/// Bananas, first (plant) crop only; ratoon cycles differ. Sources: [17] KALRO
/// TIMPs portal, banana; [18] KALRO/KCSAP banana inventory (2019) PDF pp.48,
/// 102.
static BANANAS: CalendarTable = CalendarTable {
    source: "KALRO TIMPs portal: banana; KALRO banana TIMPs inventory (2019)",
    reviewed: false,
    stages: &[
        // flowering (shooting): "8–12 months after planting" [17]:
        // 8 × 30 = 240 to 12 × 30 = 360.
        Span::new("flowering", 240, 360),
        // fruit_fill: fruit matures "3–4 months after flowering" [17]
        // (FHIA-23: 96 days [18] p.48). Starts at flowering (240) and ends
        // at the latest 360 + 4 × 30 = 480.
        Span::new("fruit_fill", 240, 480),
        // maturity: conflict. [18] p.102: tissue-culture plants 9–12 months,
        // conventional suckers 12–14 months (= 270–420). [17] implies
        // flowering 240–360 + 90–120 days = 330–480. Widest supported range:
        // 270–480.
        Span::new("maturity", 270, 480),
    ],
    tasks: &[
        // sucker_selection: suckers appear "about 2 months after planting"
        // [17] (2 × 30 = 60); select 3 of them [17].
        Span::new("sucker_selection", 60, 60),
        // desuckering: "1–2 months later" keep the most vigorous and remove
        // the rest [17]: 60 + 30 = 90 to 60 + 60 = 120.
        Span::new("desuckering", 90, 120),
        // flower_remains_removal: remove dried flower remains "8–11 days after
        // the bunch emerges" [17]. Bunch emergence = flowering 240–360, so
        // 240 + 8 = 248 to 360 + 11 = 371.
        Span::new("flower_remains_removal", 248, 371),
    ],
};

/// Every crop that has an approved, sourced calendar, with its table.
/// One row per crop, in catalogue order.
pub static TABLES: &[(Crop, &CalendarTable)] = &[
    (Crop::Maize, &MAIZE),
    (Crop::Sorghum, &SORGHUM),
    (Crop::FingerMillet, &FINGER_MILLET),
    (Crop::PearlMillet, &PEARL_MILLET),
    (Crop::Rice, &RICE),
    (Crop::Beans, &BEANS),
    (Crop::GreenGrams, &GREEN_GRAMS),
    (Crop::Cowpeas, &COWPEAS),
    (Crop::PigeonPeas, &PIGEON_PEAS),
    (Crop::Cassava, &CASSAVA),
    (Crop::IrishPotatoes, &IRISH_POTATOES),
    (Crop::SweetPotatoes, &SWEET_POTATOES),
    (Crop::Bananas, &BANANAS),
];

/// The calendar table for `crop`, if it has one.
#[must_use]
pub fn table_for(crop: Crop) -> Option<&'static CalendarTable> {
    TABLES
        .iter()
        .find(|(listed, _)| *listed == crop)
        .map(|(_, table)| *table)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::calendar::check_table;

    #[test]
    fn every_table_is_well_formed() {
        for (crop, table) in TABLES {
            assert_eq!(check_table(table), Ok(()), "{crop:?}");
        }
    }

    #[test]
    fn each_crop_has_at_most_one_table_and_other_has_none() {
        for (i, (crop, _)) in TABLES.iter().enumerate() {
            assert_ne!(*crop, Crop::Other, "a crop the farmer names has no source");
            assert!(
                TABLES[i + 1..].iter().all(|(later, _)| later != crop),
                "{crop:?} is listed twice"
            );
        }
    }
}
