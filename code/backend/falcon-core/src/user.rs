//! Farmer profile rules: Kenyan phone number, name, language and privacy
//! consent.
//!
//! Sign-in itself is handled by Clerk (see `falcon-api`), so there are no
//! password or session rules here. These rules run in `falcon-api` (for
//! example on a farm contact's phone number) and later in the mobile apps
//! before anything is sent, so both apply exactly the same rules.
//!
//! The types here are "parse, don't validate" newtypes: the only way to get a
//! [`Phone`] or a [`Name`] is through `parse`, so any code holding one knows it
//! already passed the rules. In TypeScript you would get the same effect with a
//! branded type (`string & { __brand: "Phone" }`); in Rust the private field of
//! the tuple struct does it, because no other module can build one directly.

use crate::CoreError;

/// Longest display name, in characters, after trimming.
pub const NAME_MAX_CHARS: usize = 80;

/// A Kenyan mobile number, normalised to `+254` followed by nine digits, the
/// first of which is `7` or `1` (for example `+254712345678`).
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Phone(String);

impl Phone {
    /// Checks and normalises a Kenyan mobile number.
    ///
    /// Accepted forms (spaces and dashes anywhere are ignored):
    /// `07XXXXXXXX`, `01XXXXXXXX`, `+2547XXXXXXXX`, `+2541XXXXXXXX`,
    /// `2547XXXXXXXX`, `2541XXXXXXXX`.
    ///
    /// # Errors
    /// [`CoreError::Validation`] on field `phone` for anything else.
    pub fn parse(input: &str) -> Result<Self, CoreError> {
        let compact: String = input.chars().filter(|c| !matches!(c, ' ' | '-')).collect();

        // The nine digits after the country code / leading zero.
        let subscriber = if let Some(rest) = compact.strip_prefix("+254") {
            rest
        } else if let Some(rest) = compact.strip_prefix("254") {
            rest
        } else if let Some(rest) = compact.strip_prefix('0') {
            rest
        } else {
            return Err(invalid_phone());
        };

        let valid = subscriber.len() == 9
            && subscriber.bytes().all(|b| b.is_ascii_digit())
            && matches!(subscriber.as_bytes().first(), Some(b'7' | b'1'));
        if !valid {
            return Err(invalid_phone());
        }
        Ok(Self(format!("+254{subscriber}")))
    }

    /// The normalised number, e.g. `+254712345678`.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Consumes the phone and returns the normalised string.
    #[must_use]
    pub fn into_string(self) -> String {
        self.0
    }
}

fn invalid_phone() -> CoreError {
    CoreError::validation(
        "phone",
        "Enter a Kenyan mobile number, for example 0712 345 678",
    )
}

/// A farmer's display name: trimmed, 1 to 80 characters.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Name(String);

impl Name {
    /// Trims surrounding whitespace and checks the length.
    ///
    /// Length is counted in characters (Unicode scalar values), not bytes, so a
    /// name with accented letters is not cut short.
    ///
    /// # Errors
    /// [`CoreError::Validation`] on field `name` when empty or too long.
    pub fn parse(input: &str) -> Result<Self, CoreError> {
        let trimmed = input.trim();
        let len = trimmed.chars().count();
        if len == 0 {
            return Err(CoreError::validation("name", "Enter your name"));
        }
        if len > NAME_MAX_CHARS {
            return Err(CoreError::validation(
                "name",
                format!("Name must be at most {NAME_MAX_CHARS} characters"),
            ));
        }
        Ok(Self(trimmed.to_string()))
    }

    /// The trimmed name.
    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Consumes the name and returns the trimmed string.
    #[must_use]
    pub fn into_string(self) -> String {
        self.0
    }
}

/// The language the farmer reads the app in.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Language {
    /// English, code `en`.
    En,
    /// Kiswahili, code `sw`.
    Sw,
}

impl Language {
    /// Parses a language code: exactly `en` or `sw`.
    ///
    /// # Errors
    /// [`CoreError::Validation`] on field `language` for any other value.
    pub fn parse(code: &str) -> Result<Self, CoreError> {
        match code {
            "en" => Ok(Self::En),
            "sw" => Ok(Self::Sw),
            _ => Err(CoreError::validation(
                "language",
                "Language must be en or sw",
            )),
        }
    }

    /// The language code, `en` or `sw`.
    #[must_use]
    pub fn code(self) -> &'static str {
        match self {
            Self::En => "en",
            Self::Sw => "sw",
        }
    }
}

/// A farmer may only register after agreeing to the privacy notice.
///
/// # Errors
/// [`CoreError::Validation`] on field `consent` when `given` is false.
pub fn require_consent(given: bool) -> Result<(), CoreError> {
    if given {
        Ok(())
    } else {
        Err(CoreError::validation(
            "consent",
            "You must agree to the privacy notice to create an account",
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // `match` must cover every variant. These rules only ever return
    // `Validation`, so any other variant fails the test.
    fn field_of(err: &CoreError) -> &str {
        match err {
            CoreError::Validation { field, .. } => field,
            other => panic!("expected CoreError::Validation, got {other:?}"),
        }
    }

    #[test]
    fn phone_accepts_every_kenyan_form_and_normalises() {
        let cases = [
            ("0712345678", "+254712345678"),
            ("0112345678", "+254112345678"),
            ("+254712345678", "+254712345678"),
            ("+254112345678", "+254112345678"),
            ("254712345678", "+254712345678"),
            ("254112345678", "+254112345678"),
            ("0712 345 678", "+254712345678"),
            ("0712-345-678", "+254712345678"),
            ("+254 712-345 678", "+254712345678"),
            ("  0712345678  ", "+254712345678"),
        ];
        for (input, expected) in cases {
            let phone = Phone::parse(input).unwrap_or_else(|e| panic!("{input}: {e}"));
            assert_eq!(phone.as_str(), expected, "input {input}");
        }
    }

    #[test]
    fn phone_refuses_everything_else() {
        let cases = [
            "",
            "   ",
            "071234567",        // too short
            "07123456789",      // too long
            "0812345678",       // 08 is not a mobile prefix
            "0212345678",       // landline-style prefix
            "+254812345678",    // wrong first subscriber digit
            "+25471234567",     // too short after +254
            "+2547123456789",   // too long after +254
            "+255712345678",    // Tanzania
            "712345678",        // no leading 0 or country code
            "0712a45678",       // letter
            "+254 712.345.678", // dots are not allowed
            "(0712) 345678",    // brackets are not allowed
            "++254712345678",
            "０７１２３４５６７８", // full-width digits
        ];
        for input in cases {
            let err = Phone::parse(input).expect_err(input);
            assert_eq!(field_of(&err), "phone", "input {input:?}");
        }
    }

    #[test]
    fn name_is_trimmed_and_bounded() {
        assert_eq!(
            Name::parse("  Wanjiku Kamau ").unwrap().as_str(),
            "Wanjiku Kamau"
        );
        assert_eq!(Name::parse("A").unwrap().as_str(), "A");
        let eighty = "é".repeat(NAME_MAX_CHARS); // 80 chars, 160 bytes
        assert_eq!(Name::parse(&eighty).unwrap().as_str(), eighty);
    }

    #[test]
    fn name_refuses_empty_and_too_long() {
        for input in ["", "   ", "\t\n"] {
            assert_eq!(field_of(&Name::parse(input).unwrap_err()), "name");
        }
        let long = "a".repeat(NAME_MAX_CHARS + 1);
        assert_eq!(field_of(&Name::parse(&long).unwrap_err()), "name");
    }

    #[test]
    fn language_is_en_or_sw() {
        assert_eq!(Language::parse("en").unwrap(), Language::En);
        assert_eq!(Language::parse("sw").unwrap(), Language::Sw);
        assert_eq!(Language::En.code(), "en");
        assert_eq!(Language::Sw.code(), "sw");
        for input in ["", "EN", "Sw", "fr", "en-KE", " en"] {
            assert_eq!(field_of(&Language::parse(input).unwrap_err()), "language");
        }
    }

    #[test]
    fn consent_is_required() {
        assert!(require_consent(true).is_ok());
        assert_eq!(field_of(&require_consent(false).unwrap_err()), "consent");
    }
}
