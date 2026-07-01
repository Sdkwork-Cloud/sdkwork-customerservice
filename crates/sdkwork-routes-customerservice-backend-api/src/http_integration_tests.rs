use std::sync::Arc;

use axum::body::{to_bytes, Body};
use axum::http::{Request, StatusCode};
use axum::Extension;
use sdkwork_communication_customerservice_service::{
    testing::MemoryTicketRepository, CreateTicketCommand, CustomerServiceService,
};
use sdkwork_iam_context_service::{AuthLevel, DeploymentMode, Environment, IamAppContext};
use serde_json::Value;
use tower::ServiceExt;
use uuid::Uuid;

use crate::backend_routes::backend_router_core;
use crate::backend_ticket_admin_port::backend_ticket_admin_port;

fn test_iam_context(tenant_id: Uuid, user_id: Uuid) -> IamAppContext {
    IamAppContext::new(
        tenant_id.to_string(),
        None,
        user_id.to_string(),
        "session-backend-test",
        "app-backend-test",
        Environment::Dev,
        DeploymentMode::Local,
        AuthLevel::Password,
        Vec::new(),
        Vec::new(),
    )
}

fn memory_ticket_service() -> Arc<CustomerServiceService<MemoryTicketRepository>> {
    Arc::new(CustomerServiceService::new(MemoryTicketRepository::new()))
}

fn memory_backend_router(
    service: Arc<CustomerServiceService<MemoryTicketRepository>>,
) -> axum::Router {
    backend_router_core(backend_ticket_admin_port(Arc::clone(&service)), None)
}

async fn response_json(response: axum::response::Response) -> Value {
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    serde_json::from_slice(&body).expect("json body")
}

#[tokio::test]
async fn missing_iam_context_returns_401_problem_detail() {
    let app = memory_backend_router(memory_ticket_service());
    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/customer_services/tickets")
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
async fn list_admin_tickets_returns_sdkwork_page_envelope() {
    let tenant_id = Uuid::new_v4();
    let user_id = Uuid::new_v4();
    let service = memory_ticket_service();
    CustomerServiceService::create_ticket(
        service.as_ref(),
        CreateTicketCommand {
            tenant_id,
            organization_id: None,
            requester_user_id: user_id,
            subject: "operator view".to_owned(),
            body: "please review".to_owned(),
            priority: None,
            channel: None,
        },
    )
    .await
    .expect("seed ticket");

    let app = memory_backend_router(Arc::clone(&service))
        .layer(Extension(test_iam_context(tenant_id, user_id)));
    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/backend/v3/api/customer_services/tickets")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::OK);
    let json = response_json(response).await;
    assert_eq!(json["code"], 0);
    assert_eq!(json["data"]["items"].as_array().map(Vec::len), Some(1));
    assert_eq!(json["data"]["items"][0]["subject"], "operator view");
}

#[tokio::test]
async fn retrieve_admin_ticket_returns_item_envelope() {
    let tenant_id = Uuid::new_v4();
    let user_id = Uuid::new_v4();
    let service = memory_ticket_service();
    let created = CustomerServiceService::create_ticket(
        service.as_ref(),
        CreateTicketCommand {
            tenant_id,
            organization_id: None,
            requester_user_id: user_id,
            subject: "detail".to_owned(),
            body: "body".to_owned(),
            priority: None,
            channel: None,
        },
    )
    .await
    .expect("seed ticket");
    let ticket_id = created.summary.id;

    let app = memory_backend_router(service).layer(Extension(test_iam_context(tenant_id, user_id)));
    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!(
                    "/backend/v3/api/customer_services/tickets/{ticket_id}"
                ))
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("response");
    assert_eq!(response.status(), StatusCode::OK);
    let json = response_json(response).await;
    assert_eq!(json["code"], 0);
    assert_eq!(json["data"]["item"]["subject"], "detail");
}
