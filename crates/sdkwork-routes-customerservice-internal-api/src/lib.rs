pub mod http_route_manifest;
pub mod ingress_auth;
pub mod internal_routes;
pub mod response;
pub mod routes;

pub use http_route_manifest::internal_route_manifest;
pub use routes::{build_internal_router, gateway_mount, gateway_mount_business};

use sdkwork_web_core::HttpRouteManifest;

pub fn gateway_route_manifest() -> HttpRouteManifest {
    internal_route_manifest()
}
