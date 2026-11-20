//! Migration CLI (`cargo run -p migration -- up`, or `sea-orm-cli migrate up`).
//! Reads `DATABASE_URL` from the environment.

use sea_orm_migration::prelude::*;

#[tokio::main]
async fn main() {
    cli::run_cli(migration::Migrator).await;
}
