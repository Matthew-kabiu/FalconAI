# Falcon AI

Falcon AI helps small-scale farmers in Kenya keep farm records and plan what to do next. It brings plot records, planting dates, field activities, input costs, and seasonal history into a mobile-friendly web app in English and Kiswahili.

## What farmers can do

- Register farms and plots and track crop cycles from planting through harvest.
- See upcoming crop stages and tasks where published Kenyan crop-calendar references are available.
- Log field activities, inputs, and costs, then use the calendar and season history to plan the next round of work.

The planned pilot will explore photo-based crop-health guidance for maize and beans, with agricultural professionals reviewing uncertain or serious cases. [Product vision](VISION.md) · [Crop calendar sources](docs/crop-calendar-sources.md)

## How it works

| Component | Stack |
| --- | --- |
| Web app | React, TypeScript, Vite, and Tailwind CSS in [`code/frontend`](code/frontend) |
| API | Rust and Axum with a versioned REST API in [`code/backend`](code/backend) |
| Data | PostgreSQL 17, SeaORM, and workspace-managed migrations |
| Sign-in | Clerk sessions verified by the API, with farm records scoped to their owner |

See the [OpenAPI specification](code/backend/api/openapi.yaml) for API routes and payloads.

## Run locally

Install Docker with the Compose plugin and GNU Make. From the repository root, copy the development template.

```sh
cd code
cp .env.example .env.development
```

Fill in the host ports, local database credentials, and Clerk development configuration in `.env.development`. Keep `DATABASE_URL` aligned with the database credentials and use `postgres` as its host inside Compose. Set `CORS_ORIGINS` to the frontend URL and `VITE_API_BASE_URL` to the API URL ending in `/api`.

```sh
make dev-up
make dev-logs
```

Open `http://localhost:<FRONTEND_PORT>`. The API health endpoint is `http://localhost:<API_PORT>/api/health`. Run `make dev-down` when finished.

## Continuous integration

[GitHub Actions](.github/workflows/ci.yml) runs on pull requests, pushes to `main`, and manual dispatches. It checks Rust formatting, Clippy, and types, runs unit and ownership tests against disposable PostgreSQL, and builds the Rust workspace. It also runs ESLint, TypeScript checks, and the web build. Compose validation covers development, staging, and production and checks that staging mirrors production.

[`code/.env.git`](code/.env.git) contains public CI fixtures. Keep local and deployed credentials in their environment-specific files or secret stores.
