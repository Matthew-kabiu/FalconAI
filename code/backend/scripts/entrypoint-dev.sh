#!/bin/sh
# Dev entrypoint (template §20.1): migrate, then cargo watch -x run.
# The app also runs Migrator::up at startup; this step surfaces migration
# errors before the watcher starts.
set -eu

# The image's dependency-cache layer built empty placeholder crates, and the
# bind-mounted real sources can be older than those artifacts, so cargo would
# reuse the placeholders. Touching the crate roots forces a real build.
touch falcon-core/src/lib.rs falcon-api/src/lib.rs falcon-api/src/main.rs \
      migration/src/lib.rs migration/src/main.rs

sea-orm-cli migrate up -d migration
exec cargo watch -x 'run -p falcon-api --bin api'
