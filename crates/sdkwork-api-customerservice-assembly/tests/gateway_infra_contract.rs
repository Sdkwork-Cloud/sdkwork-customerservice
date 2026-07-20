use std::sync::Arc;

use axum::body::{to_bytes, Body};
use axum::http::{Request, StatusCode};
use axum::Extension;
use axum::Router;
use sdkwork_communication_customerservice_service::{
    testing::MemoryTicketRepository, CustomerServiceService,
};
use sdkwork_iam_context_service::{AuthLevel, DeploymentMode, Environment, IamAppContext};
use sdkwork_routes_customerservice_app_api::app_customerservice_router_with_service;
use sdkwork_web_bootstrap::{assemble_multi_surface_router, ServiceRouterConfig};
use tower::ServiceExt;
use uuid::Uuid;

fn test_iam_context(tenant_id: Uuid, user_id: Uuid) -> IamAppContext {
    IamAppContext::new(
        tenant_id.to_string(),
        None,
        user_id.to_string(),
        "session-gateway-test",
        "app-gateway-test",
        Environment::Dev,
        DeploymentMode::Local,
        AuthLevel::Password,
        Vec::new(),
        Vec::new(),
    )
}

fn memory_app_router() -> Router {
    let service = Arc::new(CustomerServiceService::new(MemoryTicketRepository::new()));
    app_customerservice_router_with_service(service)
}

fn test_gateway_router() -> Router {
    assemble_multi_surface_router(
        [memory_app_router(), Router::new(), Router::new()],
        ServiceRouterConfig::default().with_always_ready(),
    )
}

#[tokio::test]
async fn gateway_exposes_health_ready_and_metrics() {
    let app = test_gateway_router();
    for path in ["/healthz", "/livez", "/readyz", "/metrics"] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(path)
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect(path);
        assert_eq!(
            response.status(),
            StatusCode::OK,
            "expected {path} to succeed"
        );
    }

    let metrics = app
        .oneshot(
            Request::builder()
                .uri("/metrics")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("metrics");
    let body = to_bytes(metrics.into_body(), usize::MAX)
        .await
        .expect("metrics body");
    assert!(
        String::from_utf8_lossy(&body).contains("sdkwork_http_requests_total"),
        "metrics should expose sdkwork_http_requests_total"
    );
}

#[tokio::test]
async fn gateway_mounts_memory_app_surface_with_sdkwork_envelope() {
    let tenant_id = Uuid::new_v4();
    let user_id = Uuid::new_v4();
    let app = test_gateway_router().layer(Extension(test_iam_context(tenant_id, user_id)));
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/app/v3/api/customer_services/tickets")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"subject":"gateway","body":"integration test"}"#,
                ))
                .expect("request"),
        )
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::CREATED);
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    let json: serde_json::Value = serde_json::from_slice(&body).expect("json");
    assert_eq!(json["code"], 0);
    assert_eq!(json["data"]["item"]["subject"], "gateway");
}
