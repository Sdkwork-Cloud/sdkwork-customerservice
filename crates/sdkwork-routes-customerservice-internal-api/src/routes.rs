use axum::Router;
use sdkwork_customerservice_service_host::CustomerServiceHost;
use std::sync::Arc;

use crate::internal_routes::internal_customerservice_router;

pub fn build_internal_router(host: Arc<CustomerServiceHost>) -> Router {
    internal_customerservice_router(host)
}

pub async fn gateway_mount_business(host: Arc<CustomerServiceHost>) -> Router {
    build_internal_router(host)
}

pub async fn gateway_mount(host: Arc<CustomerServiceHost>) -> Router {
    gateway_mount_business(host).await
}
