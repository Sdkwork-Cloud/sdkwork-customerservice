pub mod backend_routes;
pub mod backend_ticket_admin_port;
pub mod http_route_manifest;
pub mod paths;
pub mod response;
pub mod routes;
pub mod subject;
pub mod web_bootstrap;

#[cfg(test)]
#[path = "http_integration_tests.rs"]
mod http_integration_tests;

pub use backend_routes::{
    backend_customerservice_router, backend_customerservice_router_with_ticket_port,
    backend_router_core,
};
pub use backend_ticket_admin_port::backend_ticket_admin_port;
pub use http_route_manifest::backend_route_manifest;
pub use routes::{build_backend_router_with_framework, gateway_mount_business};

use axum::Router;
use sdkwork_customerservice_service_host::CustomerServiceHost;
use sdkwork_web_core::HttpRouteManifest;
use std::sync::Arc;

pub fn gateway_route_manifest() -> HttpRouteManifest {
    backend_route_manifest()
}

pub async fn gateway_mount(host: Arc<CustomerServiceHost>) -> Router {
    gateway_mount_business(host).await
}
