use axum::extract::{Extension, Path, Query, State};
use axum::response::Response;
use axum::routing::{get, patch, post};
use axum::{Json, Router};
use sdkwork_communication_customerservice_service::{
    delivery_block_rule_catalog, CreateAutoReplyRuleCommand, CreateChannelAccountCommand,
    SendMessageCommand, UpdateAutoReplyRuleCommand, UpdateChannelAccountCommand,
    UpdateTicketCommand, UpsertChannelCredentialCommand, UpsertDeliveryBlockRuleItem,
    UpsertPluginEnablementCommand,
};
use sdkwork_customerservice_service_host::CustomerServiceHost;
use sdkwork_iam_context_service::IamAppContext;
use sdkwork_web_core::WebRequestContext;
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::backend_ticket_admin_port::{backend_ticket_admin_port, BackendTicketAdminPort};
use crate::response::{
    bad_request, created_resource, not_found, ok_command, ok_items, ok_page, ok_resource,
    runtime_error, service_error, subject_auth_error,
};
use crate::subject::app_runtime_subject_from_extension;
use crate::web_bootstrap::with_backend_request_identity;
use sdkwork_communication_customerservice_service::CustomerServiceError;

fn web_ctx(context: &Option<Extension<WebRequestContext>>) -> Option<&WebRequestContext> {
    context.as_ref().map(|extension| &extension.0)
}

#[derive(Clone)]
struct BackendState {
    tickets: Arc<dyn BackendTicketAdminPort>,
    host: Option<Arc<CustomerServiceHost>>,
}

fn require_host(
    state: &BackendState,
    web_context: Option<&WebRequestContext>,
) -> Result<Arc<CustomerServiceHost>, Box<Response>> {
    match &state.host {
        Some(host) => Ok(Arc::clone(host)),
        None => Err(Box::new(service_error(
            CustomerServiceError::Persistence(
                "backend extension routes require service host".to_owned(),
            ),
            web_context,
        ))),
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminListQuery {
    page: Option<u32>,
    #[serde(alias = "limit")]
    page_size: Option<u32>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PaginationQuery {
    page: Option<u32>,
    page_size: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateTicketBody {
    status: Option<String>,
    priority: Option<String>,
    assignee_user_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SendMessageBody {
    body: String,
}

pub fn backend_customerservice_router(host: Arc<CustomerServiceHost>) -> Router {
    backend_customerservice_router_with_ticket_port(
        backend_ticket_admin_port(host.service_arc()),
        Some(host),
    )
}

pub fn backend_customerservice_router_with_ticket_port(
    tickets: Arc<dyn BackendTicketAdminPort>,
    host: Option<Arc<CustomerServiceHost>>,
) -> Router {
    with_backend_request_identity(backend_router_core(tickets, host))
}

pub fn backend_router_core(
    tickets: Arc<dyn BackendTicketAdminPort>,
    host: Option<Arc<CustomerServiceHost>>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/customer_services/tickets",
            get(list_tickets),
        )
        .route(
            "/backend/v3/api/customer_services/tickets/{ticketId}",
            get(retrieve_ticket).patch(update_ticket),
        )
        .route(
            "/backend/v3/api/customer_services/tickets/{ticketId}/messages",
            get(list_messages).post(send_message),
        )
        .route(
            "/backend/v3/api/customer_services/plugins",
            get(list_plugins),
        )
        .route(
            "/backend/v3/api/customer_services/plugins/{pluginCode}/enablement",
            axum::routing::put(upsert_plugin_enablement),
        )
        .route(
            "/backend/v3/api/customer_services/channels/accounts",
            get(list_channel_accounts).post(create_channel_account),
        )
        .route(
            "/backend/v3/api/customer_services/channels/accounts/{accountId}",
            patch(update_channel_account),
        )
        .route(
            "/backend/v3/api/customer_services/channels/accounts/{accountId}/credentials",
            axum::routing::post(register_channel_credential),
        )
        .route(
            "/backend/v3/api/customer_services/channels/auto_reply_rules",
            get(list_auto_reply_rules).post(create_auto_reply_rule),
        )
        .route(
            "/backend/v3/api/customer_services/channels/auto_reply_rules/{ruleId}",
            patch(update_auto_reply_rule).delete(delete_auto_reply_rule),
        )
        .route(
            "/backend/v3/api/customer_services/channels/delivery_block_rules/catalog",
            get(list_delivery_block_rule_catalog),
        )
        .route(
            "/backend/v3/api/customer_services/channels/accounts/{accountId}/delivery_block_rules",
            get(list_delivery_block_rules).put(upsert_delivery_block_rules),
        )
        .route(
            "/backend/v3/api/customer_services/channels/accounts/{accountId}/runtime/start",
            post(start_channel_account_runtime),
        )
        .route(
            "/backend/v3/api/customer_services/channels/accounts/{accountId}/runtime/stop",
            post(stop_channel_account_runtime),
        )
        .route(
            "/backend/v3/api/customer_services/channels/accounts/{accountId}/runtime/status",
            get(channel_account_runtime_status),
        )
        .with_state(BackendState { tickets, host })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChannelAccountListQuery {
    page: Option<u32>,
    page_size: Option<u32>,
    plugin_code: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateChannelAccountBody {
    plugin_code: String,
    display_name: String,
    owner_user_id: Uuid,
    organization_id: Option<Uuid>,
    external_account_id: Option<String>,
}

async fn list_plugins(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    match host
        .service()
        .list_plugin_catalog_for_tenant(subject.tenant_id)
        .await
    {
        Ok(items) => {
            let total = items.len() as u64;
            ok_page(items, 0, total.max(1) as u32, total, web)
        }
        Err(error) => service_error(error, web),
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpsertPluginEnablementBody {
    enabled: bool,
    config: Option<serde_json::Value>,
}

async fn upsert_plugin_enablement(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(plugin_code): Path<String>,
    context: Option<Extension<IamAppContext>>,
    Json(body): Json<UpsertPluginEnablementBody>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    if plugin_code.trim().is_empty() {
        return bad_request("pluginCode is required", web);
    }
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    match host
        .service()
        .upsert_plugin_enablement(UpsertPluginEnablementCommand {
            tenant_id: subject.tenant_id,
            plugin_code,
            enabled: body.enabled,
            config: body.config,
        })
        .await
    {
        Ok(data) => ok_resource(data, web),
        Err(error) => service_error(error, web),
    }
}

async fn list_channel_accounts(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Query(query): Query<ChannelAccountListQuery>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let page = query.page.unwrap_or(0);
    let page_size = query.page_size.unwrap_or(20);
    let plugin_code = query.plugin_code.as_deref();
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    match host
        .service()
        .list_channel_accounts(subject.tenant_id, plugin_code, page, page_size)
        .await
    {
        Ok((items, total)) => ok_page(items, page, page_size, total, web),
        Err(error) => service_error(error, web),
    }
}

async fn create_channel_account(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    context: Option<Extension<IamAppContext>>,
    Json(body): Json<CreateChannelAccountBody>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    match host
        .service()
        .create_channel_account(CreateChannelAccountCommand {
            tenant_id: subject.tenant_id,
            organization_id: body.organization_id,
            plugin_code: body.plugin_code,
            display_name: body.display_name,
            owner_user_id: body.owner_user_id,
            external_account_id: body.external_account_id,
        })
        .await
    {
        Ok(data) => created_resource(data, web),
        Err(error) => service_error(error, web),
    }
}

async fn list_tickets(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Query(query): Query<AdminListQuery>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let page = query.page.unwrap_or(0);
    let page_size = query.page_size.unwrap_or(20);
    let status = query.status.as_deref();
    match state
        .tickets
        .list_admin_tickets(subject.tenant_id, status, page, page_size)
        .await
    {
        Ok((items, total)) => ok_page(items, page, page_size, total, web),
        Err(error) => service_error(error, web),
    }
}

async fn retrieve_ticket(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(ticket_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    match state
        .tickets
        .retrieve_ticket(subject.tenant_id, ticket_id)
        .await
    {
        Ok(data) => ok_resource(data, web),
        Err(error) => service_error(error, web),
    }
}

async fn update_ticket(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(ticket_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
    Json(body): Json<UpdateTicketBody>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    match state
        .tickets
        .update_ticket(UpdateTicketCommand {
            tenant_id: subject.tenant_id,
            ticket_id,
            status: body.status,
            priority: body.priority,
            assignee_user_id: body.assignee_user_id,
        })
        .await
    {
        Ok(data) => ok_resource(data, web),
        Err(error) => service_error(error, web),
    }
}

async fn list_messages(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(ticket_id): Path<Uuid>,
    Query(query): Query<PaginationQuery>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let page = query.page.unwrap_or(0);
    let page_size = query.page_size.unwrap_or(50);
    match state
        .tickets
        .list_messages(subject.tenant_id, ticket_id, page, page_size)
        .await
    {
        Ok((items, total)) => ok_page(items, page, page_size, total, web),
        Err(error) => service_error(error, web),
    }
}

async fn send_message(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(ticket_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
    Json(body): Json<SendMessageBody>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    match state
        .tickets
        .send_message(
            SendMessageCommand {
                tenant_id: subject.tenant_id,
                ticket_id,
                author_user_id: subject.user_id,
                author_role: "agent".to_owned(),
                body: body.body,
            },
            true,
        )
        .await
    {
        Ok(data) => ok_resource(data, web),
        Err(error) => service_error(error, web),
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RegisterCredentialBody {
    credential_kind: String,
    payload: String,
}

async fn register_channel_credential(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(account_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
    Json(body): Json<RegisterCredentialBody>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    match host
        .service()
        .upsert_channel_credential(UpsertChannelCredentialCommand {
            tenant_id: subject.tenant_id,
            account_id,
            credential_kind: body.credential_kind,
            payload: body.payload.into_bytes(),
            key_version: String::new(),
        })
        .await
    {
        Ok(()) => ok_command(web),
        Err(error) => service_error(error, web),
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AutoReplyRuleListQuery {
    page: Option<u32>,
    page_size: Option<u32>,
    plugin_code: Option<String>,
    account_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateAutoReplyRuleBody {
    plugin_code: String,
    account_id: Option<Uuid>,
    rule_kind: String,
    priority: Option<i32>,
    enabled: Option<bool>,
    match_pattern: Option<String>,
    reply_content: String,
}

async fn list_auto_reply_rules(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Query(query): Query<AutoReplyRuleListQuery>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let page = query.page.unwrap_or(0);
    let page_size = query.page_size.unwrap_or(20);
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    match host
        .service()
        .list_auto_reply_rules(
            subject.tenant_id,
            query.plugin_code.as_deref(),
            query.account_id,
            page,
            page_size,
        )
        .await
    {
        Ok((items, total)) => ok_page(items, page, page_size, total, web),
        Err(error) => service_error(error, web),
    }
}

async fn create_auto_reply_rule(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    context: Option<Extension<IamAppContext>>,
    Json(body): Json<CreateAutoReplyRuleBody>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    match host
        .service()
        .create_auto_reply_rule(CreateAutoReplyRuleCommand {
            tenant_id: subject.tenant_id,
            account_id: body.account_id,
            plugin_code: body.plugin_code,
            rule_kind: body.rule_kind,
            priority: body.priority,
            enabled: body.enabled,
            match_pattern: body.match_pattern,
            reply_content: body.reply_content,
        })
        .await
    {
        Ok(data) => created_resource(data, web),
        Err(error) => service_error(error, web),
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateChannelAccountBody {
    display_name: Option<String>,
    enabled: Option<bool>,
    status: Option<String>,
}

async fn update_channel_account(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(account_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
    Json(body): Json<UpdateChannelAccountBody>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    match host
        .service()
        .update_channel_account(UpdateChannelAccountCommand {
            tenant_id: subject.tenant_id,
            account_id,
            display_name: body.display_name,
            enabled: body.enabled,
            status: body.status,
        })
        .await
    {
        Ok(data) => ok_resource(data, web),
        Err(error) => service_error(error, web),
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateAutoReplyRuleBody {
    priority: Option<i32>,
    enabled: Option<bool>,
    match_pattern: Option<String>,
    reply_content: Option<String>,
}

async fn update_auto_reply_rule(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(rule_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
    Json(body): Json<UpdateAutoReplyRuleBody>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    match host
        .service()
        .update_auto_reply_rule(UpdateAutoReplyRuleCommand {
            tenant_id: subject.tenant_id,
            rule_id,
            priority: body.priority,
            enabled: body.enabled,
            match_pattern: body.match_pattern,
            reply_content: body.reply_content,
        })
        .await
    {
        Ok(data) => ok_resource(data, web),
        Err(error) => service_error(error, web),
    }
}

async fn delete_auto_reply_rule(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(rule_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    match host
        .service()
        .delete_auto_reply_rule(subject.tenant_id, rule_id)
        .await
    {
        Ok(()) => ok_command(web),
        Err(error) => service_error(error, web),
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeliveryBlockCatalogQuery {
    plugin_code: String,
}

async fn list_delivery_block_rule_catalog(
    web_context: Option<Extension<WebRequestContext>>,
    Query(query): Query<DeliveryBlockCatalogQuery>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let _ = subject;
    let items = delivery_block_rule_catalog(&query.plugin_code);
    ok_items(items, web)
}

async fn list_delivery_block_rules(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(account_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    match host
        .service()
        .list_delivery_block_rules_for_account(subject.tenant_id, account_id)
        .await
    {
        Ok(items) => {
            let total = items.len() as u64;
            ok_page(items, 0, total.max(1) as u32, total, web)
        }
        Err(error) => service_error(error, web),
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpsertDeliveryBlockRulesBody {
    plugin_code: String,
    rules: Vec<UpsertDeliveryBlockRuleItem>,
}

async fn upsert_delivery_block_rules(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(account_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
    Json(body): Json<UpsertDeliveryBlockRulesBody>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    match host
        .service()
        .upsert_delivery_block_rules(subject.tenant_id, account_id, &body.plugin_code, body.rules)
        .await
    {
        Ok(items) => {
            let total = items.len() as u64;
            ok_page(items, 0, total.max(1) as u32, total, web)
        }
        Err(error) => service_error(error, web),
    }
}

async fn start_channel_account_runtime(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(account_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    if host
        .service()
        .require_channel_account_for_tenant(subject.tenant_id, account_id)
        .await
        .is_err()
    {
        return not_found("channel account not found", web);
    }
    match host.plugin_runtime().start_account(account_id).await {
        Ok(data) => ok_resource(data, web),
        Err(error) => runtime_error(error, web),
    }
}

async fn stop_channel_account_runtime(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(account_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    if host
        .service()
        .require_channel_account_for_tenant(subject.tenant_id, account_id)
        .await
        .is_err()
    {
        return not_found("channel account not found", web);
    }
    match host.plugin_runtime().stop_account(account_id).await {
        Ok(data) => ok_resource(data, web),
        Err(error) => runtime_error(error, web),
    }
}

async fn channel_account_runtime_status(
    State(state): State<BackendState>,
    web_context: Option<Extension<WebRequestContext>>,
    Path(account_id): Path<Uuid>,
    context: Option<Extension<IamAppContext>>,
) -> Response {
    let web = web_ctx(&web_context);
    let subject = match app_runtime_subject_from_extension(context) {
        Ok(subject) => subject,
        Err(error) => return subject_auth_error(error, web),
    };
    let host = match require_host(&state, web) {
        Ok(host) => host,
        Err(response) => return *response,
    };
    if host
        .service()
        .require_channel_account_for_tenant(subject.tenant_id, account_id)
        .await
        .is_err()
    {
        return not_found("channel account not found", web);
    }
    match host.plugin_runtime().status(account_id).await {
        Ok(data) => ok_resource(data, web),
        Err(error) => runtime_error(error, web),
    }
}
