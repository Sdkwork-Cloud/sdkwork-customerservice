pub mod app_routes;
pub mod http_route_manifest;
pub mod paths;
pub mod response;
pub mod routes;
pub mod subject;
pub mod ticket_api_port;
pub mod web_bootstrap;

#[cfg(test)]
#[path = "http_integration_tests.rs"]
mod http_integration_tests;

pub use app_routes::{app_customerservice_router, app_customerservice_router_with_service};
pub use http_route_manifest::app_route_manifest;
pub use routes::{build_app_router_with_framework, gateway_mount_business};

use axum::Router;
use sdkwork_customerservice_service_host::CustomerServiceHost;
use sdkwork_web_core::HttpRouteManifest;
use std::sync::Arc;

pub fn gateway_route_manifest() -> HttpRouteManifest {
    app_route_manifest()
}

pub async fn gateway_mount(host: Arc<CustomerServiceHost>) -> Router {
    gateway_mount_business(host).await
}
