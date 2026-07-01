use axum::extract::{Extension, Path, Query, State};
use axum::response::Response;
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_communication_customerservice_service::{
    CreateTicketCommand, CustomerServiceError, CustomerServiceRepository, CustomerServiceService,
    RegisterAttachmentCommand, SendMessageCommand,
};
use sdkwork_customerservice_service_host::CustomerServiceHost;
use sdkwork_iam_context_service::IamAppContext;
use sdkwork_web_core::WebRequestContext;
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::response::{
    created_resource, ok_items, ok_page, ok_resource, service_error, subject_auth_error,
};
use crate::subject::app_runtime_subject_from_extension;
use crate::ticket_api_port::{ticket_api_port, TicketApiPort};

#[derive(Clone)]
struct AppState {
    service: Arc<dyn TicketApiPort>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListTicketsQuery {
    page: Option<u32>,
    page_size: Option<u32>,
    limit: Option<u32>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PaginationQuery {
    page: Option<u32>,
    page_size: Option<u32>,
    limit: Option<u32>,
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

fn web_ctx(context: &Option<Extension<WebRequestContext>>) -> Option<&WebRequestContext> {
    context.as_ref().map(|extension| &extension.0)
}

fn resolve_page_size(page_size: Option<u32>, limit: Option<u32>, default: u32) -> u32 {
    page_size.or(limit).unwrap_or(default).clamp(1, 100)
}

pub fn app_customerservice_router(host: Arc<CustomerServiceHost>) -> Router {
    app_customerservice_router_with_service(host.service_arc())
}

pub fn app_customerservice_router_with_service<R>(service: Arc<CustomerServiceService<R>>) -> Router
where
    R: CustomerServiceRepository + Send + Sync + 'static,
{
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
        .with_state(AppState {
            service: ticket_api_port(service),
        })
}

async fn list_my_tickets(
    State(state): State<AppState>,
    Query(query): Query<ListTicketsQuery>,
    context: Option<Extension<IamAppContext>>,
    web_context: Option<Extension<WebRequestContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let page = query.page.unwrap_or(0);
    let page_size = resolve_page_size(query.page_size, query.limit, 20);
    let status = query.status.as_deref();
    match state
        .service
        .list_my_tickets(subject.tenant_id, subject.user_id, status, page, page_size)
        .await
    {
        Ok((items, total)) => ok_page(items, page, page_size, total, web),
        Err(error) => service_error(error, web),
    }
}

async fn create_ticket(
    State(state): State<AppState>,
    context: Option<Extension<IamAppContext>>,
    web_context: Option<Extension<WebRequestContext>>,
    Json(body): Json<CreateTicketBody>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    match state
        .service
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
        Ok(data) => created_resource(data, web),
        Err(error) => service_error(error, web),
    }
}

async fn retrieve_ticket(
    State(state): State<AppState>,
    Path(ticket_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
    web_context: Option<Extension<WebRequestContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    match state
        .service
        .retrieve_ticket_for_requester(subject.tenant_id, subject.user_id, ticket_id)
        .await
    {
        Ok(data) => ok_resource(data, web),
        Err(error) => service_error(error, web),
    }
}

async fn list_messages(
    State(state): State<AppState>,
    Path(ticket_id): Path<Uuid>,
    Query(query): Query<PaginationQuery>,
    context: Option<Extension<IamAppContext>>,
    web_context: Option<Extension<WebRequestContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let page = query.page.unwrap_or(0);
    let page_size = resolve_page_size(query.page_size, query.limit, 50);
    match state
        .service
        .list_messages_for_requester(
            subject.tenant_id,
            subject.user_id,
            ticket_id,
            page,
            page_size,
        )
        .await
    {
        Ok((items, total)) => ok_page(items, page, page_size, total, web),
        Err(error) => service_error(error, web),
    }
}

async fn send_message(
    State(state): State<AppState>,
    Path(ticket_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
    web_context: Option<Extension<WebRequestContext>>,
    Json(body): Json<SendMessageBody>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    match state
        .service
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
        Ok(data) => ok_resource(data, web),
        Err(error) => service_error(error, web),
    }
}

async fn register_attachment(
    State(state): State<AppState>,
    Path(ticket_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
    web_context: Option<Extension<WebRequestContext>>,
    Json(body): Json<RegisterAttachmentBody>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    match state
        .service
        .register_drive_attachment_for_requester(
            subject.user_id,
            RegisterAttachmentCommand {
                tenant_id: subject.tenant_id,
                ticket_id,
                drive_node_id: body.drive_node_id,
                file_name: body.file_name,
                content_type: body.content_type,
                size_bytes: body.size_bytes,
                uploaded_by_user_id: subject.user_id,
            },
        )
        .await
    {
        Ok(data) => created_resource(data, web),
        Err(error) => service_error(error, web),
    }
}

async fn list_attachments(
    State(state): State<AppState>,
    Path(ticket_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
    web_context: Option<Extension<WebRequestContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    match state
        .service
        .list_attachments_for_requester(subject.tenant_id, subject.user_id, ticket_id)
        .await
    {
        Ok(data) => ok_items(data, web),
        Err(error) => service_error(error, web),
    }
}

#[allow(dead_code)]
fn map_error(error: CustomerServiceError, web_context: Option<&WebRequestContext>) -> Response {
    service_error(error, web_context)
}
