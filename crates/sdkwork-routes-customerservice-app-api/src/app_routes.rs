use axum::extract::{Extension, Path, Query, State};
use axum::response::Response;
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_communication_customerservice_service::{
    CreateTicketCommand, CustomerServiceError, RegisterAttachmentCommand, SendMessageCommand,
};
use sdkwork_customerservice_service_host::CustomerServiceHost;
use sdkwork_iam_context_service::IamAppContext;
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::response::{
    bad_request, created_resource, ok_items, ok_page, ok_resource, service_error,
};
use crate::subject::app_runtime_subject_from_extension;

#[derive(Clone)]
struct AppState {
    host: Arc<CustomerServiceHost>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PaginationQuery {
    page: Option<u32>,
    page_size: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateTicketBody {
    subject: String,
    body: String,
    priority: Option<String>,
    channel: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SendMessageBody {
    body: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RegisterAttachmentBody {
    drive_node_id: Uuid,
    file_name: String,
    content_type: Option<String>,
    size_bytes: Option<i64>,
}

pub fn app_customerservice_router(host: Arc<CustomerServiceHost>) -> Router {
    Router::new()
        .route(
            "/app/v3/api/customer_services/tickets",
            get(list_my_tickets).post(create_ticket),
        )
        .route(
            "/app/v3/api/customer_services/tickets/{ticketId}",
            get(retrieve_ticket),
        )
        .route(
            "/app/v3/api/customer_services/tickets/{ticketId}/messages",
            get(list_messages).post(send_message),
        )
        .route(
            "/app/v3/api/customer_services/tickets/{ticketId}/attachments",
            get(list_attachments).post(register_attachment),
        )
        .with_state(AppState { host })
}

async fn list_my_tickets(
    State(state): State<AppState>,
    Query(query): Query<PaginationQuery>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(message) => return bad_request(&message),
    };
    let page = query.page.unwrap_or(0);
    let page_size = query.page_size.unwrap_or(20);
    match state
        .host
        .service()
        .list_my_tickets(subject.tenant_id, subject.user_id, page, page_size)
        .await
    {
        Ok((items, total)) => ok_page(items, page, page_size, total),
        Err(error) => service_error(error),
    }
}

async fn create_ticket(
    State(state): State<AppState>,
    context: Option<Extension<IamAppContext>>,
    Json(body): Json<CreateTicketBody>,
) -> Response {
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(message) => return bad_request(&message),
    };
    match state
        .host
        .service()
        .create_ticket(CreateTicketCommand {
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
            requester_user_id: subject.user_id,
            subject: body.subject,
            body: body.body,
            priority: body.priority,
            channel: body.channel,
        })
        .await
    {
        Ok(data) => created_resource(data),
        Err(error) => service_error(error),
    }
}

async fn retrieve_ticket(
    State(state): State<AppState>,
    Path(ticket_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(message) => return bad_request(&message),
    };
    match state
        .host
        .service()
        .retrieve_ticket(subject.tenant_id, ticket_id)
        .await
    {
        Ok(data) => ok_resource(data),
        Err(error) => service_error(error),
    }
}

async fn list_messages(
    State(state): State<AppState>,
    Path(ticket_id): Path<Uuid>,
    Query(query): Query<PaginationQuery>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(message) => return bad_request(&message),
    };
    let page = query.page.unwrap_or(0);
    let page_size = query.page_size.unwrap_or(50);
    match state
        .host
        .service()
        .list_messages(subject.tenant_id, ticket_id, page, page_size)
        .await
    {
        Ok((items, total)) => ok_page(items, page, page_size, total),
        Err(error) => service_error(error),
    }
}

async fn send_message(
    State(state): State<AppState>,
    Path(ticket_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
    Json(body): Json<SendMessageBody>,
) -> Response {
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(message) => return bad_request(&message),
    };
    match state
        .host
        .service()
        .send_message(
            SendMessageCommand {
                tenant_id: subject.tenant_id,
                ticket_id,
                author_user_id: subject.user_id,
                author_role: "customer".to_owned(),
                body: body.body,
            },
            false,
        )
        .await
    {
        Ok(data) => ok_resource(data),
        Err(error) => service_error(error),
    }
}

async fn register_attachment(
    State(state): State<AppState>,
    Path(ticket_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
    Json(body): Json<RegisterAttachmentBody>,
) -> Response {
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(message) => return bad_request(&message),
    };
    match state
        .host
        .service()
        .register_drive_attachment(RegisterAttachmentCommand {
            tenant_id: subject.tenant_id,
            ticket_id,
            drive_node_id: body.drive_node_id,
            file_name: body.file_name,
            content_type: body.content_type,
            size_bytes: body.size_bytes,
            uploaded_by_user_id: subject.user_id,
        })
        .await
    {
        Ok(data) => created_resource(data),
        Err(error) => service_error(error),
    }
}

async fn list_attachments(
    State(state): State<AppState>,
    Path(ticket_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(message) => return bad_request(&message),
    };
    match state
        .host
        .service()
        .list_attachments(subject.tenant_id, ticket_id)
        .await
    {
        Ok(data) => ok_items(data),
        Err(error) => service_error(error),
    }
}

#[allow(dead_code)]
fn map_error(error: CustomerServiceError) -> Response {
    service_error(error)
}
