# Falcon AI backend tasks (template §4.1: run, test, lint, migrate, build).
# Run from code/backend/. Needs the env vars from code/.env.* exported
# (APP_ENV, PORT, DATABASE_URL, CLERK_ISSUER, CORS_ORIGINS, ...) for run/migrate.

.PHONY: run test lint migrate build

run:
	cargo run -p falcon-api --bin api

test:
	cargo test --workspace

lint:
	cargo fmt --all --check
	cargo clippy --workspace --all-targets -- -D warnings

migrate:
	sea-orm-cli migrate up -d migration

build:
	cargo build --release -p falcon-api --bin api
