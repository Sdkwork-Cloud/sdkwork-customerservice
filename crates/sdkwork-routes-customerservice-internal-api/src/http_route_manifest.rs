use sdkwork_web_core::{HttpMethod, HttpRoute, HttpRouteManifest};

const HTTP_ROUTES: &[HttpRoute] = &[
    HttpRoute::api_key(
        HttpMethod::Post,
        "/internal/v3/api/customer_services/plugins/{pluginCode}/accounts/{accountId}/start",
        "customerservice",
        "customerservice.plugins.internal.accounts.start",
    ),
    HttpRoute::api_key(
        HttpMethod::Post,
        "/internal/v3/api/customer_services/plugins/{pluginCode}/accounts/{accountId}/stop",
        "customerservice",
        "customerservice.plugins.internal.accounts.stop",
    ),
    HttpRoute::api_key(
        HttpMethod::Get,
        "/internal/v3/api/customer_services/plugins/{pluginCode}/accounts/{accountId}/status",
        "customerservice",
        "customerservice.plugins.internal.accounts.status",
    ),
    HttpRoute::api_key(
        HttpMethod::Post,
        "/internal/v3/api/customer_services/plugins/{pluginCode}/accounts/{accountId}/send_message",
        "customerservice",
        "customerservice.plugins.internal.accounts.sendMessage",
    ),
    HttpRoute::api_key(
        HttpMethod::Post,
        "/internal/v3/api/customer_services/plugins/{pluginCode}/accounts/{accountId}/delivery_pre_check",
        "customerservice",
        "customerservice.plugins.internal.accounts.deliveryPreCheck",
    ),
];

pub fn internal_route_manifest() -> HttpRouteManifest {
    HttpRouteManifest::new(HTTP_ROUTES)
}
