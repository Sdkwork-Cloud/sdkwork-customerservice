//! Shared helpers for Postgres integration tests across repository and gateway crates.

use std::path::PathBuf;

use crate::{bootstrap_customerservice_database_from_env, CustomerServiceDatabaseHost};

/// Resolves the customerservice application root for database lifecycle tooling.
pub fn app_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
}

/// Applies standard Postgres integration test environment variables.
pub fn prepare_env() {
    std::env::set_var("SDKWORK_CUSTOMER_SERVICE_APP_ROOT", app_root());
    std::env::set_var("SDKWORK_CUSTOMER_SERVICE_DATABASE_AUTO_MIGRATE", "true");
    let _ = dotenvy::dotenv();
}

/// Returns true when `CUSTOMER_SERVICE_DATABASE_URL` is configured.
pub fn database_url_configured() -> bool {
    std::env::var("CUSTOMER_SERVICE_DATABASE_URL").is_ok()
}

/// Bootstraps Postgres schema when database URL is available; otherwise returns `None`.
pub async fn try_bootstrap_database_host() -> Option<CustomerServiceDatabaseHost> {
    if !database_url_configured() {
        return None;
    }
    prepare_env();
    match bootstrap_customerservice_database_from_env().await {
        Ok(host) => Some(host),
        Err(error) => {
            eprintln!("SKIP postgres integration: bootstrap failed: {error}");
            None
        }
    }
}
