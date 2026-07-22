use std::sync::Arc;

use axum::body::{to_bytes, Body};
use axum::http::{Request, StatusCode};
use axum::Extension;
use sdkwork_communication_customerservice_service::{
    testing::MemoryTicketRepository, CustomerServiceService,
};
use sdkwork_iam_context_service::{AuthLevel, DeploymentMode, Environment, IamAppContext};
use serde_json::Value;
use tower::ServiceExt;
use uuid::Uuid;

use crate::app_routes::app_customerservice_router_with_service;

fn test_iam_context(tenant_id: Uuid, user_id: Uuid) -> IamAppContext {
    IamAppContext::new(
        tenant_id.to_string(),
        None,
        user_id.to_string(),
        "session-http-test",
        "app-http-test",
        Environment::Dev,
        DeploymentMode::Local,
        AuthLevel::Password,
        Vec::new(),
        Vec::new(),
    )
}

fn memory_service() -> Arc<CustomerServiceService<MemoryTicketRepository>> {
    Arc::new(CustomerServiceService::new(MemoryTicketRepository::new()))
}

async fn response_json(response: axum::response::Response) -> Value {
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    serde_json::from_slice(&body).expect("json body")
}

async fn request(
    service: Arc<CustomerServiceService<MemoryTicketRepository>>,
    iam_context: IamAppContext,
    method: &str,
    uri: &str,
    body: Option<&str>,
) -> axum::response::Response {
    let app = app_customerservice_router_with_service(service).layer(Extension(iam_context));
    let mut builder = Request::builder().method(method).uri(uri);
    if body.is_some() {
        builder = builder.header("content-type", "application/json");
    }
    let request = builder
        .body(Body::from(body.unwrap_or("").to_owned()))
        .expect("request");
    app.oneshot(request).await.expect("response")
}

#[tokio::test]
async fn missing_iam_context_returns_401_problem_detail() {
    let app = app_customerservice_router_with_service(memory_service());
    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/app/v3/api/customer_services/tickets")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    let json = response_json(response).await;
    assert_eq!(json["code"], 40101);
}

#[tokio::test]
async fn create_ticket_returns_sdkwork_envelope_with_item() {
    let tenant_id = Uuid::new_v4();
    let user_id = Uuid::new_v4();
    let response = request(
        memory_service(),
        test_iam_context(tenant_id, user_id),
        "POST",
        "/app/v3/api/customer_services/tickets",
        Some(r#"{"subject":"help","body":"please assist"}"#),
    )
    .await;
    assert_eq!(response.status(), StatusCode::CREATED);
    let json = response_json(response).await;
    assert_eq!(json["code"], 0);
    assert_eq!(json["data"]["item"]["subject"], "help");
    assert!(json["traceId"]
        .as_str()
        .is_some_and(|value| !value.is_empty()));
}

#[tokio::test]
async fn list_tickets_honors_canonical_page_size_query() {
    let tenant_id = Uuid::new_v4();
    let user_id = Uuid::new_v4();
    let response = request(
        memory_service(),
        test_iam_context(tenant_id, user_id),
        "GET",
        "/app/v3/api/customer_services/tickets?page=0&pageSize=7",
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let json = response_json(response).await;
    assert_eq!(json["code"], 0);
    assert_eq!(json["data"]["pageInfo"]["pageSize"], 7);
}

#[tokio::test]
async fn retrieve_ticket_hides_ticket_from_other_requester() {
    let tenant_id = Uuid::new_v4();
    let owner_id = Uuid::new_v4();
    let other_id = Uuid::new_v4();
    let service = memory_service();
    let create_response = request(
        Arc::clone(&service),
        test_iam_context(tenant_id, owner_id),
        "POST",
        "/app/v3/api/customer_services/tickets",
        Some(r#"{"subject":"private","body":"owner only"}"#),
    )
    .await;
    let created = response_json(create_response).await;
    let ticket_id = created["data"]["item"]["id"].as_str().expect("ticket id");
    let response = request(
        service,
        test_iam_context(tenant_id, other_id),
        "GET",
        &format!("/app/v3/api/customer_services/tickets/{ticket_id}"),
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let json = response_json(response).await;
    assert_eq!(json["code"], 40401);
}
