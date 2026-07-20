use std::sync::Arc;

use axum::body::{to_bytes, Body};
use axum::http::{Request, StatusCode};
use axum::Extension;
use axum::Router;
use sdkwork_customerservice_database_host::testing::postgres_integration;
use sdkwork_api_customerservice_assembly::assemble_api_router;
use sdkwork_customerservice_service_host::CustomerServiceHost;
use sdkwork_iam_context_service::{AuthLevel, DeploymentMode, Environment, IamAppContext};
use serde_json::Value;
use tower::ServiceExt;
use uuid::Uuid;

const TEST_INGRESS_TOKEN: &str = "customerservice-postgres-http-test";

fn test_iam_context(tenant_id: Uuid, user_id: Uuid) -> IamAppContext {
    IamAppContext::new(
        tenant_id.to_string(),
        None,
        user_id.to_string(),
        "session-postgres-http",
        "app-postgres-http",
        Environment::Dev,
        DeploymentMode::Local,
        AuthLevel::Password,
        Vec::new(),
        Vec::new(),
    )
}

fn ensure_ingress_token() {
    if std::env::var("SDKWORK_CUSTOMERSERVICE_INGRESS_TOKEN")
        .map(|value| value.trim().is_empty())
        .unwrap_or(true)
    {
        std::env::set_var("SDKWORK_CUSTOMERSERVICE_INGRESS_TOKEN", TEST_INGRESS_TOKEN);
    }
}

async fn try_postgres_gateway() -> Option<Router> {
    if !postgres_integration::database_url_configured() {
        return None;
    }

    postgres_integration::prepare_env();
    ensure_ingress_token();

    let host = match CustomerServiceHost::from_env().await {
        Ok(host) => Arc::new(host),
        Err(error) => {
            eprintln!("SKIP postgres HTTP integration: host bootstrap failed: {error}");
            return None;
        }
    };

    let assembly = assemble_api_router(host).await;
    Some(assembly.router)
}

async fn response_json(response: axum::response::Response) -> Value {
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body");
    serde_json::from_slice(&body).expect("json body")
}

async fn request_with_iam(
    app: Router,
    iam_context: IamAppContext,
    method: &str,
    uri: &str,
    body: Option<&str>,
) -> axum::response::Response {
    let app = app.layer(Extension(iam_context));
    let mut builder = Request::builder().method(method).uri(uri);
    if body.is_some() {
        builder = builder.header("content-type", "application/json");
    }
    let request = builder
        .body(Body::from(body.unwrap_or("").to_owned()))
        .expect("request");
    app.oneshot(request).await.expect("response")
}

async fn request_internal(
    app: Router,
    method: &str,
    uri: &str,
    headers: &[(&str, &str)],
    body: Option<&str>,
) -> axum::response::Response {
    let mut builder = Request::builder().method(method).uri(uri);
    for (name, value) in headers {
        builder = builder.header(*name, *value);
    }
    if body.is_some() {
        builder = builder.header("content-type", "application/json");
    }
    let request = builder
        .body(Body::from(body.unwrap_or("").to_owned()))
        .expect("request");
    app.oneshot(request).await.expect("response")
}

fn ingress_token() -> String {
    std::env::var("SDKWORK_CUSTOMERSERVICE_INGRESS_TOKEN")
        .unwrap_or_else(|_| TEST_INGRESS_TOKEN.to_owned())
}

#[tokio::test]
#[ignore = "requires CUSTOMER_SERVICE_DATABASE_URL and migrated schema"]
async fn postgres_gateway_readyz_succeeds_with_postgres_pool() {
    let Some(app) = try_postgres_gateway().await else {
        eprintln!("SKIP postgres HTTP integration: CUSTOMER_SERVICE_DATABASE_URL is not set");
        return;
    };
    let response = app
        .oneshot(
            Request::builder()
                .uri("/readyz")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("readyz");
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
#[ignore = "requires CUSTOMER_SERVICE_DATABASE_URL and migrated schema"]
async fn postgres_gateway_create_ticket_returns_sdkwork_envelope() {
    let Some(app) = try_postgres_gateway().await else {
        eprintln!("SKIP postgres HTTP integration: CUSTOMER_SERVICE_DATABASE_URL is not set");
        return;
    };
    let tenant_id = Uuid::new_v4();
    let user_id = Uuid::new_v4();
    let response = request_with_iam(
        app,
        test_iam_context(tenant_id, user_id),
        "POST",
        "/app/v3/api/customer_services/tickets",
        Some(r#"{"subject":"postgres http","body":"gateway e2e"}"#),
    )
    .await;
    assert_eq!(response.status(), StatusCode::CREATED);
    let json = response_json(response).await;
    assert_eq!(json["code"], 0);
    assert_eq!(json["data"]["item"]["subject"], "postgres http");
    assert!(json["traceId"]
        .as_str()
        .is_some_and(|value| !value.is_empty()));
}

#[tokio::test]
#[ignore = "requires CUSTOMER_SERVICE_DATABASE_URL and migrated schema"]
async fn postgres_gateway_retrieve_hides_ticket_from_other_requester() {
    let Some(app) = try_postgres_gateway().await else {
        eprintln!("SKIP postgres HTTP integration: CUSTOMER_SERVICE_DATABASE_URL is not set");
        return;
    };
    let tenant_id = Uuid::new_v4();
    let owner_id = Uuid::new_v4();
    let other_id = Uuid::new_v4();

    let create_response = request_with_iam(
        app.clone(),
        test_iam_context(tenant_id, owner_id),
        "POST",
        "/app/v3/api/customer_services/tickets",
        Some(r#"{"subject":"private","body":"owner only"}"#),
    )
    .await;
    let created = response_json(create_response).await;
    let ticket_id = created["data"]["item"]["id"].as_str().expect("ticket id");

    let response = request_with_iam(
        app,
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

#[tokio::test]
#[ignore = "requires CUSTOMER_SERVICE_DATABASE_URL and migrated schema"]
async fn postgres_gateway_backend_list_and_retrieve_ticket() {
    let Some(app) = try_postgres_gateway().await else {
        eprintln!("SKIP postgres HTTP integration: CUSTOMER_SERVICE_DATABASE_URL is not set");
        return;
    };
    let tenant_id = Uuid::new_v4();
    let operator_id = Uuid::new_v4();

    let create_response = request_with_iam(
        app.clone(),
        test_iam_context(tenant_id, operator_id),
        "POST",
        "/app/v3/api/customer_services/tickets",
        Some(r#"{"subject":"backend postgres","body":"operator view"}"#),
    )
    .await;
    assert_eq!(create_response.status(), StatusCode::CREATED);
    let created = response_json(create_response).await;
    let ticket_id = created["data"]["item"]["id"].as_str().expect("ticket id");

    let list_response = request_with_iam(
        app.clone(),
        test_iam_context(tenant_id, operator_id),
        "GET",
        "/backend/v3/api/customer_services/tickets",
        None,
    )
    .await;
    assert_eq!(list_response.status(), StatusCode::OK);
    let list_json = response_json(list_response).await;
    assert_eq!(list_json["code"], 0);
    assert!(
        list_json["data"]["items"]
            .as_array()
            .is_some_and(|items| items
                .iter()
                .any(|item| item["subject"] == "backend postgres")),
        "backend list should include created ticket"
    );

    let retrieve_response = request_with_iam(
        app,
        test_iam_context(tenant_id, operator_id),
        "GET",
        &format!("/backend/v3/api/customer_services/tickets/{ticket_id}"),
        None,
    )
    .await;
    assert_eq!(retrieve_response.status(), StatusCode::OK);
    let retrieve_json = response_json(retrieve_response).await;
    assert_eq!(retrieve_json["code"], 0);
    assert_eq!(retrieve_json["data"]["item"]["subject"], "backend postgres");
}

#[tokio::test]
#[ignore = "requires CUSTOMER_SERVICE_DATABASE_URL and migrated schema"]
async fn postgres_gateway_backend_retrieve_hides_ticket_from_other_tenant() {
    let Some(app) = try_postgres_gateway().await else {
        eprintln!("SKIP postgres HTTP integration: CUSTOMER_SERVICE_DATABASE_URL is not set");
        return;
    };
    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();
    let user_id = Uuid::new_v4();

    let create_response = request_with_iam(
        app.clone(),
        test_iam_context(tenant_a, user_id),
        "POST",
        "/app/v3/api/customer_services/tickets",
        Some(r#"{"subject":"tenant scoped","body":"tenant isolation"}"#),
    )
    .await;
    let created = response_json(create_response).await;
    let ticket_id = created["data"]["item"]["id"].as_str().expect("ticket id");

    let response = request_with_iam(
        app,
        test_iam_context(tenant_b, user_id),
        "GET",
        &format!("/backend/v3/api/customer_services/tickets/{ticket_id}"),
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let json = response_json(response).await;
    assert_eq!(json["code"], 40401);
}

#[tokio::test]
#[ignore = "requires CUSTOMER_SERVICE_DATABASE_URL and migrated schema"]
async fn postgres_gateway_internal_missing_ingress_token_returns_401() {
    let Some(app) = try_postgres_gateway().await else {
        eprintln!("SKIP postgres HTTP integration: CUSTOMER_SERVICE_DATABASE_URL is not set");
        return;
    };
    let account_id = Uuid::new_v4();
    let response = request_internal(
        app,
        "GET",
        &format!("/internal/v3/api/customer_services/plugins/goofish/accounts/{account_id}/status"),
        &[],
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    let json = response_json(response).await;
    assert_eq!(json["code"], 40101);
}

#[tokio::test]
#[ignore = "requires CUSTOMER_SERVICE_DATABASE_URL and migrated schema"]
async fn postgres_gateway_internal_valid_ingress_requires_tenant_header() {
    let Some(app) = try_postgres_gateway().await else {
        eprintln!("SKIP postgres HTTP integration: CUSTOMER_SERVICE_DATABASE_URL is not set");
        return;
    };
    let account_id = Uuid::new_v4();
    let token = ingress_token();
    let auth = format!("Bearer {token}");
    let response = request_internal(
        app,
        "GET",
        &format!("/internal/v3/api/customer_services/plugins/goofish/accounts/{account_id}/status"),
        &[("authorization", auth.as_str())],
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let json = response_json(response).await;
    assert_eq!(json["code"], 40001);
}

#[tokio::test]
#[ignore = "requires CUSTOMER_SERVICE_DATABASE_URL and migrated schema"]
async fn postgres_gateway_internal_valid_ingress_and_tenant_reaches_service_layer() {
    let Some(app) = try_postgres_gateway().await else {
        eprintln!("SKIP postgres HTTP integration: CUSTOMER_SERVICE_DATABASE_URL is not set");
        return;
    };
    let tenant_id = Uuid::new_v4();
    let account_id = Uuid::new_v4();
    let token = ingress_token();
    let auth = format!("Bearer {token}");
    let tenant = tenant_id.to_string();
    let response = request_internal(
        app,
        "GET",
        &format!("/internal/v3/api/customer_services/plugins/goofish/accounts/{account_id}/status"),
        &[
            ("authorization", auth.as_str()),
            ("x-sdkwork-tenant-id", tenant.as_str()),
        ],
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let json = response_json(response).await;
    assert_eq!(json["code"], 40401);
}
