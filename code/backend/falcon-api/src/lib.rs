//! Falcon AI HTTP API.
//!
//! Layout follows the backend template §4.1. Business rules live in
//! `falcon_core`; this crate holds transport, persistence and configuration.
//! A service here calls `falcon_core` for every rule instead of re-implementing it.

pub mod account;
pub mod activity;
pub mod admin;
pub mod calendar;
pub mod config;
pub mod crop;
pub mod crop_cycle;
pub mod db;
pub mod error;
pub mod event;
pub mod farm;
pub mod health;
pub mod http;
pub mod platform;
pub mod plot;
pub mod state;
