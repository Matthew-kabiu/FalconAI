//! "Today" in Kenya.
//!
//! `falcon-core` never reads a clock: rules such as "plantedOn at most 183
//! days after today" take today as a parameter. This is where the API decides
//! what today is: the calendar day in Kenya (East Africa Time, UTC+3).
//!
//! Kenya has no daylight saving time, so a fixed +3 hours is exact all year
//! and needs no time-zone database (the `chrono-tz` crate). Server clocks run
//! in UTC; between 21:00 and 24:00 UTC it is already tomorrow in Nairobi.

use chrono::{NaiveDate, TimeDelta, Utc};

/// East Africa Time's offset from UTC, in hours.
const KENYA_UTC_OFFSET_HOURS: i64 = 3;

/// Today's date in Kenya.
#[must_use]
pub fn today_in_kenya() -> NaiveDate {
    kenya_date_at(Utc::now().naive_utc())
}

/// The Kenyan calendar day at a UTC instant. Separate so tests can pin the time.
fn kenya_date_at(utc: chrono::NaiveDateTime) -> NaiveDate {
    (utc + TimeDelta::hours(KENYA_UTC_OFFSET_HOURS)).date()
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;

    use super::kenya_date_at;

    fn at(y: i32, m: u32, d: u32, h: u32, min: u32) -> chrono::NaiveDateTime {
        NaiveDate::from_ymd_opt(y, m, d)
            .unwrap()
            .and_hms_opt(h, min, 0)
            .unwrap()
    }

    #[test]
    fn kenya_is_three_hours_ahead_of_utc() {
        let nov_19 = NaiveDate::from_ymd_opt(2026, 11, 19).unwrap();
        let nov_20 = NaiveDate::from_ymd_opt(2026, 11, 20).unwrap();
        assert_eq!(kenya_date_at(at(2026, 11, 19, 0, 0)), nov_19);
        assert_eq!(kenya_date_at(at(2026, 11, 19, 20, 59)), nov_19);
        assert_eq!(kenya_date_at(at(2026, 11, 19, 21, 0)), nov_20); // midnight in Nairobi
        assert_eq!(kenya_date_at(at(2026, 12, 31, 22, 0)).to_string(), "2027-01-01");
    }
}
