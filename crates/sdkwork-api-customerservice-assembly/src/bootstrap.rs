use axum::Router;
use sdkwork_customerservice_service_host::CustomerServiceHost;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_web_bootstrap::{assemble_multi_surface_router, ReadinessCheck, ServiceRouterConfig};
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

pub struct ApiAssembly {
    pub router: Router,
}

struct PostgresReadiness {
    pool: DatabasePool,
}

impl ReadinessCheck for PostgresReadiness {
    fn check(&self) -> Pin<Box<dyn Future<Output = Result<(), String>> + Send + '_>> {
        let pool = self.pool.clone();
        Box::pin(async move {
            let postgres = pool
                .as_postgres()
                .ok_or_else(|| "postgres database pool is unavailable".to_owned())?;
            sqlx::query("SELECT 1")
                .execute(postgres)
                .await
                .map_err(|error| error.to_string())?;
            Ok(())
        })
    }
}

pub async fn assemble_api_router(host: Arc<CustomerServiceHost>) -> ApiAssembly {
    let app_router =
        sdkwork_routes_customerservice_app_api::gateway_mount_business(host.clone()).await;
    let backend_router =
        sdkwork_routes_customerservice_backend_api::gateway_mount_business(host.clone()).await;
    let internal_router =
        sdkwork_routes_customerservice_internal_api::gateway_mount_business(host.clone()).await;

    let readiness = Arc::new(PostgresReadiness {
        pool: host.database_pool().clone(),
    });
    let router = assemble_multi_surface_router(
        [app_router, backend_router, internal_router],
        ServiceRouterConfig::default().with_readiness_check(readiness),
    );

    ApiAssembly { router }
}
