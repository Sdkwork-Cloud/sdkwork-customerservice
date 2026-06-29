use axum::Router;
use sdkwork_customerservice_service_host::CustomerServiceHost;
use sdkwork_web_bootstrap::{assemble_multi_surface_router, ServiceRouterConfig};
use std::sync::Arc;

pub struct ApplicationAssembly {
    pub router: Router,
}

pub async fn assemble_application_router(host: Arc<CustomerServiceHost>) -> ApplicationAssembly {
    let app_router =
        sdkwork_routes_customerservice_app_api::gateway_mount_business(host.clone()).await;
    let backend_router =
        sdkwork_routes_customerservice_backend_api::gateway_mount_business(host.clone()).await;
    let internal_router =
        sdkwork_routes_customerservice_internal_api::gateway_mount_business(host).await;

    let router = assemble_multi_surface_router(
        [app_router, backend_router, internal_router],
        ServiceRouterConfig::default().with_always_ready(),
    );

    ApplicationAssembly { router }
}
