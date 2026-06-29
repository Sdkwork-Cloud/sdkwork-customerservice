use axum::Router;
use sdkwork_customerservice_service_host::CustomerServiceHost;
use std::sync::Arc;

use crate::backend_routes::backend_customerservice_router;
use crate::web_bootstrap::wrap_router_with_web_framework_from_env;

pub fn build_backend_router(host: Arc<CustomerServiceHost>) -> Router {
    backend_customerservice_router(host)
}

pub async fn build_backend_router_with_framework(host: Arc<CustomerServiceHost>) -> Router {
    wrap_router_with_web_framework_from_env(build_backend_router(host)).await
}

pub async fn gateway_mount_business(host: Arc<CustomerServiceHost>) -> Router {
    build_backend_router_with_framework(host).await
}

pub async fn gateway_mount(host: Arc<CustomerServiceHost>) -> Router {
    gateway_mount_business(host).await
}
