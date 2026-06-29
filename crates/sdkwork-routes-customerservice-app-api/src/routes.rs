use axum::Router;
use sdkwork_customerservice_service_host::CustomerServiceHost;
use std::sync::Arc;

use crate::app_routes::app_customerservice_router;
use crate::web_bootstrap::wrap_router_with_web_framework_from_env;

pub fn build_app_router(host: Arc<CustomerServiceHost>) -> Router {
    app_customerservice_router(host)
}

pub async fn build_app_router_with_framework(host: Arc<CustomerServiceHost>) -> Router {
    wrap_router_with_web_framework_from_env(build_app_router(host)).await
}

pub async fn gateway_mount_business(host: Arc<CustomerServiceHost>) -> Router {
    build_app_router_with_framework(host).await
}

pub async fn gateway_mount(host: Arc<CustomerServiceHost>) -> Router {
    gateway_mount_business(host).await
}
