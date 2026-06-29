use sdkwork_web_core::{HttpMethod, HttpRoute, HttpRouteManifest};

const HTTP_ROUTES: &[HttpRoute] = &[
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/customer_services/tickets",
        "customerservice",
        "customerservice.tickets.list",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/app/v3/api/customer_services/tickets",
        "customerservice",
        "customerservice.tickets.create",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/customer_services/tickets/{ticketId}",
        "customerservice",
        "customerservice.tickets.retrieve",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/customer_services/tickets/{ticketId}/messages",
        "customerservice",
        "customerservice.tickets.messages.list",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/app/v3/api/customer_services/tickets/{ticketId}/messages",
        "customerservice",
        "customerservice.tickets.messages.create",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/app/v3/api/customer_services/tickets/{ticketId}/attachments",
        "customerservice",
        "customerservice.tickets.attachments.register",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/customer_services/tickets/{ticketId}/attachments",
        "customerservice",
        "customerservice.tickets.attachments.list",
    ),
];

pub fn app_route_manifest() -> HttpRouteManifest {
    HttpRouteManifest::new(HTTP_ROUTES)
}
