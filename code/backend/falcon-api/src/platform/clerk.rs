//! Clerk session-token verification.
//!
//! The browser signs in with Clerk, then sends `Authorization: Bearer <token>`
//! to this API. The token is a short-lived JWT that Clerk signed with RS256
//! (an RSA private key only Clerk holds). We check it with Clerk's *public*
//! keys, published as a JWKS ("JSON Web Key Set") at
//! `{CLERK_ISSUER}/.well-known/jwks.json`.
//!
//! Matt's decision (2026-11-18) replaces template §9/§13's own password and
//! token issuing: this API never sees a password and never signs a token.
//!
//! In Node you would reach for `jose`'s `createRemoteJWKSet` + `jwtVerify`.
//! Here the same two steps are spelled out:
//!
//! 1. **Keys.** Fetched lazily on the first authenticated request (so the API
//!    boots offline), cached in [`Verifier`], refetched when a token names a
//!    key id (`kid`) we have not seen — Clerk rotating its keys — but at most
//!    once every [`REFETCH_INTERVAL`], so a flood of made-up `kid`s cannot
//!    turn into a flood of requests to Clerk.
//! 2. **Claims.** RS256 only; `exp`, `nbf` and `iss` checked with
//!    [`LEEWAY_SECS`] of clock skew; `azp` (the origin the token was issued
//!    to), when present, must be one of `CORS_ORIGINS`; `sub` is the Clerk
//!    user id; `metadata.role` (Clerk's `public_metadata`) gives the
//!    [`Role`] via `falcon_core`.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use anyhow::Context;
use falcon_core::Role;
use jsonwebtoken::errors::ErrorKind;
use jsonwebtoken::jwk::{AlgorithmParameters, JwkSet};
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode, decode_header};
use serde::Deserialize;
use tokio::sync::{Mutex, RwLock};

use crate::error::AppError;

/// Deadline for one JWKS fetch, on top of the shared client's own timeout
/// (template §7, Rule 9: every outbound await has a deadline).
const JWKS_TIMEOUT: Duration = Duration::from_secs(5);

/// Minimum gap between two JWKS fetches.
pub const REFETCH_INTERVAL: Duration = Duration::from_secs(60);

/// Allowed clock skew, in seconds, for `exp` and `nbf`.
pub const LEEWAY_SECS: u64 = 5;

/// Who a valid token belongs to.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Session {
    /// Clerk user id (the `sub` claim), e.g. `user_2abc…`.
    pub user_id: String,
    /// Role from `metadata.role`; [`Role::Member`] unless exactly `"admin"`.
    pub role: Role,
}

/// Why a token was not accepted.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum VerifyError {
    /// The token is malformed, forged, expired, or not meant for us. The
    /// reason is for logs only; the client always gets the same generic 401.
    #[error("session token rejected: {0}")]
    Rejected(&'static str),
    /// Clerk's signing keys could not be fetched (logged where it happened).
    #[error("Clerk signing keys unavailable")]
    KeysUnavailable,
}

impl From<VerifyError> for AppError {
    fn from(err: VerifyError) -> Self {
        match err {
            VerifyError::Rejected(reason) => {
                // The reason helps debugging; the token itself is never logged.
                tracing::info!(reason, "session token rejected");
                Self::Unauthorized
            }
            VerifyError::KeysUnavailable => Self::Unavailable,
        }
    }
}

/// The claims we read. Unknown claims are ignored: Clerk adds its own.
#[derive(Deserialize)]
struct Claims {
    sub: String,
    #[serde(default)]
    azp: Option<String>,
    /// `public_metadata`. Kept as raw JSON so an unexpected shape (say, a
    /// number for `role`) means "member", not a rejected token.
    #[serde(default)]
    metadata: Option<serde_json::Value>,
}

/// Verifies Clerk session tokens. One instance lives in `AppState`.
pub struct Verifier {
    jwks_url: String,
    authorized_parties: Vec<String>,
    validation: Validation,
    http: reqwest::Client,
    /// Cached public keys by `kid`. A `tokio` lock because callers are async;
    /// it is only ever held for a lookup or a swap, never across a fetch.
    keys: RwLock<HashMap<String, DecodingKey>>,
    /// When the last JWKS fetch started (successful or not). Its guard is held
    /// across the fetch on purpose (template §18 allows that for a `tokio`
    /// Mutex): concurrent requests with an unknown `kid` then wait for one
    /// fetch instead of each starting their own.
    last_fetch: Mutex<Option<Instant>>,
}

impl Verifier {
    /// Builds a verifier for tokens issued by `issuer` (exact `iss` match)
    /// and requested from one of `authorized_parties` (the `azp` claim).
    ///
    /// `http` is the shared client from `AppState`; cloning a `reqwest::Client`
    /// copies a handle to the same connection pool, not the pool itself.
    #[must_use]
    pub fn new(issuer: &str, authorized_parties: &[String], http: reqwest::Client) -> Self {
        let mut validation = Validation::new(Algorithm::RS256);
        validation.leeway = LEEWAY_SECS;
        validation.validate_exp = true;
        validation.validate_nbf = true;
        // Clerk session tokens carry no `aud`; `azp` is checked instead.
        validation.validate_aud = false;
        validation.set_issuer(&[issuer]);
        validation.set_required_spec_claims(&["exp", "nbf", "iss", "sub"]);

        Self {
            jwks_url: format!("{issuer}/.well-known/jwks.json"),
            authorized_parties: authorized_parties.to_vec(),
            validation,
            http,
            keys: RwLock::new(HashMap::new()),
            last_fetch: Mutex::new(None),
        }
    }

    /// Checks a session token and returns whose it is.
    ///
    /// # Errors
    /// [`VerifyError::Rejected`] for any invalid token;
    /// [`VerifyError::KeysUnavailable`] when Clerk's keys cannot be fetched.
    pub async fn verify(&self, token: &str) -> Result<Session, VerifyError> {
        let header = decode_header(token).map_err(|_| VerifyError::Rejected("malformed token"))?;
        // Checked before any key lookup so a token in another algorithm can
        // never trigger a JWKS fetch.
        if header.alg != Algorithm::RS256 {
            return Err(VerifyError::Rejected("algorithm not allowed"));
        }
        let kid = header.kid.ok_or(VerifyError::Rejected("missing key id"))?;

        if let Some(result) = self.check_with_cached_key(token, &kid).await {
            return result;
        }
        // Unknown kid: Clerk may have rotated its keys. Refetch (throttled)
        // and try once more.
        self.refresh_keys().await?;
        self.check_with_cached_key(token, &kid)
            .await
            .unwrap_or(Err(VerifyError::Rejected("unknown signing key")))
    }

    /// `None` when no cached key has this `kid`.
    async fn check_with_cached_key(
        &self,
        token: &str,
        kid: &str,
    ) -> Option<Result<Session, VerifyError>> {
        let keys = self.keys.read().await;
        // The signature check is CPU-only and short, so it runs under the
        // read guard instead of cloning the key out.
        keys.get(kid).map(|key| self.check(token, key))
    }

    /// Signature and claim checks against one key. No I/O.
    fn check(&self, token: &str, key: &DecodingKey) -> Result<Session, VerifyError> {
        let claims = decode::<Claims>(token, key, &self.validation)
            .map_err(|e| VerifyError::Rejected(rejection_reason(e.kind())))?
            .claims;

        if let Some(azp) = &claims.azp
            && !self.authorized_parties.iter().any(|party| party == azp)
        {
            return Err(VerifyError::Rejected("azp is not an allowed origin"));
        }
        if claims.sub.is_empty() {
            return Err(VerifyError::Rejected("empty subject"));
        }

        let role_claim = claims
            .metadata
            .as_ref()
            .and_then(|metadata| metadata.get("role"))
            .and_then(serde_json::Value::as_str);
        Ok(Session {
            role: Role::from_claim(role_claim),
            user_id: claims.sub,
        })
    }

    /// Replaces the key cache from Clerk, at most once per [`REFETCH_INTERVAL`].
    async fn refresh_keys(&self) -> Result<(), VerifyError> {
        let mut last_fetch = self.last_fetch.lock().await;
        if last_fetch.is_some_and(|at| at.elapsed() < REFETCH_INTERVAL) {
            // Throttled. Another request may have just fetched (the caller
            // re-checks the cache); with no keys at all we cannot verify
            // anything, which is an outage, not a bad token.
            return if self.keys.read().await.is_empty() {
                Err(VerifyError::KeysUnavailable)
            } else {
                Ok(())
            };
        }
        *last_fetch = Some(Instant::now());

        match fetch_keys(&self.http, &self.jwks_url).await {
            Ok(keys) => {
                tracing::info!(count = keys.len(), "fetched Clerk signing keys");
                *self.keys.write().await = keys;
                Ok(())
            }
            Err(e) => {
                tracing::error!(error = ?e, "fetching Clerk signing keys failed");
                Err(VerifyError::KeysUnavailable)
            }
        }
    }
}

/// Downloads the JWKS and keeps the RSA keys that have a `kid`.
async fn fetch_keys(
    http: &reqwest::Client,
    url: &str,
) -> anyhow::Result<HashMap<String, DecodingKey>> {
    let set: JwkSet = tokio::time::timeout(JWKS_TIMEOUT, async {
        http.get(url)
            .send()
            .await?
            .error_for_status()?
            .json::<JwkSet>()
            .await
    })
    .await
    .context("JWKS request timed out")?
    .context("JWKS request failed")?;

    let keys: HashMap<String, DecodingKey> = set
        .keys
        .iter()
        .filter(|jwk| matches!(jwk.algorithm, AlgorithmParameters::RSA(_)))
        .filter_map(|jwk| {
            let kid = jwk.common.key_id.clone()?;
            DecodingKey::from_jwk(jwk).ok().map(|key| (kid, key))
        })
        .collect();
    anyhow::ensure!(!keys.is_empty(), "JWKS contains no usable RSA keys");
    Ok(keys)
}

/// A short, log-safe reason for a `jsonwebtoken` failure.
fn rejection_reason(kind: &ErrorKind) -> &'static str {
    match kind {
        ErrorKind::ExpiredSignature => "expired",
        ErrorKind::ImmatureSignature => "not yet valid (nbf)",
        ErrorKind::InvalidIssuer => "wrong issuer",
        ErrorKind::InvalidSignature => "bad signature",
        ErrorKind::InvalidAlgorithm => "algorithm not allowed",
        ErrorKind::MissingRequiredClaim(_) => "missing required claim",
        _ => "invalid token",
    }
}

/// Fixed RSA test key pair and token helpers. Test-only: these keys are not
/// used anywhere else and protect nothing.
#[cfg(test)]
pub(crate) mod testing {
    use std::collections::HashMap;
    use std::time::Instant;

    use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, encode};
    use serde_json::{Value, json};
    use tokio::sync::{Mutex, RwLock};

    use super::Verifier;

    pub(crate) const ISSUER: &str = "https://falcon-test.clerk.accounts.dev";
    pub(crate) const ORIGIN: &str = "http://localhost:5173";
    pub(crate) const KID: &str = "ins_test_key";

    const PRIVATE_PEM: &str = "-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEArKrW3U8Yw/HR8Cq4mzyorBp++lTQY/kUtM2CIthxah4W5+fU
FWr36PbVHKXP58mauPI2WNPCy8D/LVq2pClt+IXAFwc26agwK02+MT5AR4ZGda68
dedXptHGV7wK83R/Tm6EylosWJFcyLKvdpw9JLmf5U7mBMs5i9coa2yO1Out2ZnN
JpZkerxXv+GB1NV6LZP1pvnIilzCS8CJ/4urFJJquAqRo2FuAiL1/Tr9MAGGQfRy
Ts5A5TNQblWqP8MQ4QFd2oEbH02FKvH9fzs0y4qLbKdckEy7JNoUO61TBPnpWv8C
ZWttEySdxrmLN0ZpMXRgngCTHhA713y6oqMjewIDAQABAoIBAE48GB/ta1S5GHz/
9mZMLUbRuI/3ZvatUL79UMY2GOlSmeFYzuUncw2o7XXOAW5OEB9Vi99ij6Qfnd9w
d0nZhbzx6U/l0nE7Zhvw3UjVom1l/z3qPvUTLcllyj9Ncg7OTbJ9bAh9pBM7RfWf
1NXiw+eEfdj6D0nDxR7CDcviw7LgGdNTJIlHi8cdMcDDwIrOa7TniTZgL/FjgPpo
Pjyuli/H8GEL0LP4f9tLS7QtHptlTPvMF+iZaZd2+FRypaSFVdDXUM1zK+MEem8G
4JpTzgcGyms5H8P64n6FuPhDLrrwOBcM9tLKFWL6eNsowhaODrGh9jdOVoP2FiEM
8E2rGMECgYEA20wfmfrs/6xJ4+Abkv2eJiwfpeSihQOdEscxdGEZidRI9jeFgEmp
IslhVxsXbu59fh+VrIU9GY+eYN2VQLxtj5VAcfKrltdGamcUrs+5Ix79WMM7SBV0
ELIT+nKzI/yLURif1ubS4tYr/0RCoauoxAEFUSHZP8paxC0faYd/STsCgYEAyZDV
5lF11sWi87D2+LqGfLmKBL9b3EMJ9koVkGs7yap7Gk7Vps7iMI7vo+WTcC5VpH2O
IG2fztOa19G6rsGm6VRvFqscg1pbgGDA20XW+baLhYTyImBQRFPdf59K9rbinhxV
uxlFx60TwolC4s9AZ9km97bXadwq3oBbhURn6sECgYBPCwMg9ybRiQIhFrgZpTyJ
ucG2g9BobUMCb7XNouoXmeKqjJyb/vDtzvQ891Dc9S1adnv2cRfyzKdjdrrDWKeM
51kROUzL09BXrcvwroKmvBbJFaWad9Eb63P0A7+6Kt70XhHO3egJRvUYzzvNFhiA
fXWzJqYtrfxFVZZK7UHd3QKBgH9lyawu5HoApIO93/tJeWMvqepiQF8xCATgwkxr
WniWBgSUuzkZHaFvVkuS+OM4hezXZpNcdls1J3MtHf8CasqjESuUrwree2LixEJT
HBLsq7aSVrAfi9wD3cWiGrFg2k7wvcbprE8ON6UHOH0+XQjGGXkL2Y8RFw9WtYG/
wKaBAoGARugu5OwS/b6+vRfFLtXvxFFav8uMrDuRztkYT8RbF0ac/4g3KXS8lbv/
gFQIxhPB5cvIQEGqrzKZe5N6Wq6uMR0MvXRv6gaFeetbr1Cgmgm5HLKTCyEvP6yP
aS/WljsW1V2MS6RYjoUE+kVcF/krRT6V6CBazCvqgbKn+vjajYw=
-----END RSA PRIVATE KEY-----";

    const PUBLIC_PEM: &str = "-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArKrW3U8Yw/HR8Cq4mzyo
rBp++lTQY/kUtM2CIthxah4W5+fUFWr36PbVHKXP58mauPI2WNPCy8D/LVq2pClt
+IXAFwc26agwK02+MT5AR4ZGda68dedXptHGV7wK83R/Tm6EylosWJFcyLKvdpw9
JLmf5U7mBMs5i9coa2yO1Out2ZnNJpZkerxXv+GB1NV6LZP1pvnIilzCS8CJ/4ur
FJJquAqRo2FuAiL1/Tr9MAGGQfRyTs5A5TNQblWqP8MQ4QFd2oEbH02FKvH9fzs0
y4qLbKdckEy7JNoUO61TBPnpWv8CZWttEySdxrmLN0ZpMXRgngCTHhA713y6oqMj
ewIDAQAB
-----END PUBLIC KEY-----";

    /// A verifier pre-loaded with the test public key under [`KID`], marked
    /// as just fetched so an unknown `kid` never reaches the network.
    pub(crate) fn verifier() -> Verifier {
        let key = DecodingKey::from_rsa_pem(PUBLIC_PEM.as_bytes()).unwrap();
        let base = Verifier::new(ISSUER, &[ORIGIN.to_string()], reqwest::Client::new());
        Verifier {
            keys: RwLock::new(HashMap::from([(KID.to_string(), key)])),
            last_fetch: Mutex::new(Some(Instant::now())),
            ..base
        }
    }

    pub(crate) fn now() -> i64 {
        i64::try_from(jsonwebtoken::get_current_timestamp()).unwrap()
    }

    /// Claims shaped like a Clerk session token, valid for one minute.
    pub(crate) fn claims(role: Option<&str>) -> Value {
        let now = now();
        let mut claims = json!({
            "sub": "user_test123",
            "iss": ISSUER,
            "azp": ORIGIN,
            "sid": "sess_test",
            "iat": now,
            "nbf": now - 10,
            "exp": now + 60,
        });
        if let Some(role) = role {
            claims["metadata"] = json!({ "role": role });
        }
        claims
    }

    /// Signs `claims` with the test private key as RS256 under `kid`.
    pub(crate) fn sign(claims: &Value, kid: &str) -> String {
        let mut header = Header::new(Algorithm::RS256);
        header.kid = Some(kid.to_string());
        let key = EncodingKey::from_rsa_pem(PRIVATE_PEM.as_bytes()).unwrap();
        encode(&header, claims, &key).unwrap()
    }

    /// A valid member token.
    pub(crate) fn member_token() -> String {
        sign(&claims(None), KID)
    }

    /// A valid admin token.
    pub(crate) fn admin_token() -> String {
        sign(&claims(Some("admin")), KID)
    }
}

#[cfg(test)]
mod tests {
    use falcon_core::Role;
    use jsonwebtoken::{Algorithm, EncodingKey, Header, encode};
    use serde_json::json;

    use super::testing::{self, KID, claims, now, sign, verifier};
    use super::{Session, VerifyError};

    fn rejected(result: Result<Session, VerifyError>) -> &'static str {
        match result {
            Err(VerifyError::Rejected(reason)) => reason,
            other => panic!("expected a rejection, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn valid_member_token_passes() {
        let session = verifier().verify(&testing::member_token()).await.unwrap();
        assert_eq!(
            session,
            Session {
                user_id: "user_test123".into(),
                role: Role::Member,
            }
        );
    }

    #[tokio::test]
    async fn admin_role_comes_from_metadata() {
        let session = verifier().verify(&testing::admin_token()).await.unwrap();
        assert_eq!(session.role, Role::Admin);

        // Any other value, or a non-string, is a member, not a rejection.
        for role in [json!("Admin"), json!("member"), json!(1), json!(null)] {
            let mut c = claims(None);
            c["metadata"] = json!({ "role": role });
            let session = verifier().verify(&sign(&c, KID)).await.unwrap();
            assert_eq!(session.role, Role::Member, "role {role}");
        }
    }

    #[tokio::test]
    async fn missing_azp_is_allowed() {
        let mut c = claims(None);
        c.as_object_mut().unwrap().remove("azp");
        assert!(verifier().verify(&sign(&c, KID)).await.is_ok());
    }

    #[tokio::test]
    async fn wrong_issuer_fails() {
        let mut c = claims(None);
        c["iss"] = json!("https://evil.clerk.accounts.dev");
        assert_eq!(
            rejected(verifier().verify(&sign(&c, KID)).await),
            "wrong issuer"
        );
    }

    #[tokio::test]
    async fn expired_fails_beyond_leeway() {
        let mut c = claims(None);
        c["exp"] = json!(now() - 30);
        assert_eq!(rejected(verifier().verify(&sign(&c, KID)).await), "expired");
    }

    #[tokio::test]
    async fn not_yet_valid_fails() {
        let mut c = claims(None);
        c["nbf"] = json!(now() + 30);
        assert_eq!(
            rejected(verifier().verify(&sign(&c, KID)).await),
            "not yet valid (nbf)"
        );
    }

    #[tokio::test]
    async fn missing_nbf_fails() {
        let mut c = claims(None);
        c.as_object_mut().unwrap().remove("nbf");
        assert_eq!(
            rejected(verifier().verify(&sign(&c, KID)).await),
            "missing required claim"
        );
    }

    #[tokio::test]
    async fn unauthorised_azp_fails() {
        let mut c = claims(None);
        c["azp"] = json!("https://evil.example");
        assert_eq!(
            rejected(verifier().verify(&sign(&c, KID)).await),
            "azp is not an allowed origin"
        );
    }

    #[tokio::test]
    async fn wrong_algorithm_fails() {
        // HS256 signed with a guessable secret: the classic algorithm-confusion attack.
        let mut header = Header::new(Algorithm::HS256);
        header.kid = Some(KID.to_string());
        let token = encode(
            &header,
            &claims(Some("admin")),
            &EncodingKey::from_secret(b"not-a-real-secret").unwrap(),
        )
        .unwrap();
        assert_eq!(
            rejected(verifier().verify(&token).await),
            "algorithm not allowed"
        );
    }

    #[tokio::test]
    async fn unknown_kid_fails_without_fetching() {
        // The test verifier counts as freshly fetched, so this is throttled and
        // never touches the network.
        let token = sign(&claims(None), "ins_unknown");
        assert_eq!(
            rejected(verifier().verify(&token).await),
            "unknown signing key"
        );
    }

    #[tokio::test]
    async fn missing_kid_fails() {
        // A real RS256 token with its header swapped for one without `kid`.
        let signed = sign(&claims(None), KID);
        let (_header, payload_and_signature) = signed.split_once('.').unwrap();
        let header_without_kid = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9"; // {"alg":"RS256","typ":"JWT"}
        let token = format!("{header_without_kid}.{payload_and_signature}");
        assert_eq!(rejected(verifier().verify(&token).await), "missing key id");
    }

    #[tokio::test]
    async fn tampered_payload_fails() {
        let signed = testing::member_token();
        let parts: Vec<&str> = signed.split('.').collect();
        let mut c = claims(Some("admin"));
        c["sub"] = json!("user_someone_else");
        let forged_payload = sign(&c, KID);
        let forged_payload = forged_payload.split('.').nth(1).unwrap();
        let token = format!("{}.{}.{}", parts[0], forged_payload, parts[2]);
        assert_eq!(rejected(verifier().verify(&token).await), "bad signature");
    }

    #[tokio::test]
    async fn garbage_fails() {
        for token in ["", "abc", "a.b.c", "Bearer x"] {
            assert_eq!(rejected(verifier().verify(token).await), "malformed token");
        }
    }
}
