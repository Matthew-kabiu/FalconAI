//! What a signed-in person may do: the `Role` rule.
//!
//! Clerk (the sign-in service) carries each user's role in their
//! `public_metadata`, which arrives in the session token as `metadata.role`.
//! Only an exact `"admin"` grants admin rights; every other value, and no
//! value at all, means an ordinary member. That makes "member" the default for
//! every new sign-up and fails safe if the metadata is mistyped.
//!
//! This is a pure rule (no network, no token parsing), so it lives here and
//! can later run unchanged in the mobile apps.

use serde::{Deserialize, Serialize};

/// A user's role. Serialised as `"admin"` or `"member"`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    /// Can use admin-only endpoints.
    Admin,
    /// An ordinary farmer account. The default.
    Member,
}

impl Role {
    /// Maps the `metadata.role` claim to a role.
    ///
    /// Exactly `"admin"` (case-sensitive) is [`Role::Admin`]; anything else,
    /// or a missing claim, is [`Role::Member`]. Case-sensitive on purpose: a
    /// typo in the Clerk dashboard should never grant admin rights.
    #[must_use]
    pub fn from_claim(claim: Option<&str>) -> Self {
        match claim {
            Some("admin") => Self::Admin,
            _ => Self::Member,
        }
    }

    /// The wire name, `admin` or `member`.
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Admin => "admin",
            Self::Member => "member",
        }
    }

    /// True for [`Role::Admin`].
    #[must_use]
    pub fn is_admin(self) -> bool {
        self == Self::Admin
    }
}

#[cfg(test)]
mod tests {
    use super::Role;

    #[test]
    fn only_exact_admin_is_admin() {
        assert_eq!(Role::from_claim(Some("admin")), Role::Admin);
        assert!(Role::from_claim(Some("admin")).is_admin());
    }

    #[test]
    fn everything_else_is_member() {
        for claim in [
            None,
            Some(""),
            Some("member"),
            Some("Admin"),
            Some("ADMIN"),
            Some(" admin"),
            Some("admin "),
            Some("superadmin"),
            Some("owner"),
        ] {
            assert_eq!(Role::from_claim(claim), Role::Member, "claim {claim:?}");
        }
        assert!(!Role::Member.is_admin());
    }

    #[test]
    fn wire_names() {
        assert_eq!(Role::Admin.as_str(), "admin");
        assert_eq!(Role::Member.as_str(), "member");
    }
}
