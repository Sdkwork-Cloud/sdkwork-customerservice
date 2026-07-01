use axum::extract::{Extension, Path, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use sdkwork_communication_customerservice_plugin_runtime::SendChannelTextCommand;
use sdkwork_communication_customerservice_plugin_spi::{
    DeliveryAction, DeliveryCheckContext, OrderContext,
};
use sdkwork_customerservice_service_host::CustomerServiceHost;
use sdkwork_web_core::WebRequestContext;
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::ingress_auth::with_ingress_auth;
use crate::response::{
    bad_request, ok_resource, runtime_error, service_error, service_unavailable,
};

const TENANT_HEADER: &str = "x-sdkwork-tenant-id";

#[derive(Clone)]
struct InternalState {
    host: Arc<CustomerServiceHost>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SendMessageBody {
    external_conversation_id: String,
    external_recipient_id: Option<String>,
    body: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeliveryPreCheckBody {
    external_order_id: String,
    external_item_id: Option<String>,
    buyer_external_id: Option<String>,
}

pub fn internal_customerservice_router(host: Arc<CustomerServiceHost>) -> Router {
    with_ingress_auth(
        Router::new()
            .route(
                "/internal/v3/api/customer_services/plugins/{pluginCode}/accounts/{accountId}/start",
                post(start_account),
            )
            .route(
                "/internal/v3/api/customer_services/plugins/{pluginCode}/accounts/{accountId}/stop",
                post(stop_account),
            )
            .route(
                "/internal/v3/api/customer_services/plugins/{pluginCode}/accounts/{accountId}/status",
                get(account_status),
            )
            .route(
                "/internal/v3/api/customer_services/plugins/{pluginCode}/accounts/{accountId}/send_message",
                post(send_message),
            )
            .route(
                "/internal/v3/api/customer_services/plugins/{pluginCode}/accounts/{accountId}/delivery_pre_check",
                post(delivery_pre_check),
            )
            .with_state(InternalState { host }),
    )
}

fn web_ctx(context: &Option<Extension<WebRequestContext>>) -> Option<&WebRequestContext> {
    context.as_ref().map(|extension| &extension.0)
}

fn tenant_id_from_headers(headers: &HeaderMap) -> Option<Uuid> {
    let raw = headers
        .get(TENANT_HEADER)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())?;
    Uuid::parse_str(raw).ok()
}

async fn require_account_for_tenant(
    state: &InternalState,
    tenant_id: Uuid,
    account_id: Uuid,
    plugin_code: &str,
    web: Option<&WebRequestContext>,
) -> Result<(), Response> {
    let account = state
        .host
        .service()
        .require_channel_account_for_tenant(tenant_id, account_id)
        .await
        .map_err(|error| service_error(error, web))?;
    if account.plugin_code != plugin_code {
        return Err(bad_request("pluginCode does not match account plugin", web).into_response());
    }
    Ok(())
}

async fn start_account(
    State(state): State<InternalState>,
    headers: HeaderMap,
    web_context: Option<Extension<WebRequestContext>>,
    Path((plugin_code, account_id)): Path<(String, Uuid)>,
) -> Response {
    let web = web_ctx(&web_context);
    if plugin_code.trim().is_empty() {
        return bad_request("pluginCode is required", web);
    }
    let Some(tenant_id) = tenant_id_from_headers(&headers) else {
        return bad_request("x-sdkwork-tenant-id header is required", web);
    };
    if let Err(response) =
        require_account_for_tenant(&state, tenant_id, account_id, &plugin_code, web).await
    {
        return response;
    }
    match state.host.plugin_runtime().start_account(account_id).await {
        Ok(data) => ok_resource(data, web).into_response(),
        Err(error) => runtime_error(error, web),
    }
}

async fn stop_account(
    State(state): State<InternalState>,
    headers: HeaderMap,
    web_context: Option<Extension<WebRequestContext>>,
    Path((plugin_code, account_id)): Path<(String, Uuid)>,
) -> Response {
    let web = web_ctx(&web_context);
    if plugin_code.trim().is_empty() {
        return bad_request("pluginCode is required", web);
    }
    let Some(tenant_id) = tenant_id_from_headers(&headers) else {
        return bad_request("x-sdkwork-tenant-id header is required", web);
    };
    if let Err(response) =
        require_account_for_tenant(&state, tenant_id, account_id, &plugin_code, web).await
    {
        return response;
    }
    match state.host.plugin_runtime().stop_account(account_id).await {
        Ok(data) => ok_resource(data, web).into_response(),
        Err(error) => runtime_error(error, web),
    }
}

async fn account_status(
    State(state): State<InternalState>,
    headers: HeaderMap,
    web_context: Option<Extension<WebRequestContext>>,
    Path((plugin_code, account_id)): Path<(String, Uuid)>,
) -> Response {
    let web = web_ctx(&web_context);
    if plugin_code.trim().is_empty() {
        return bad_request("pluginCode is required", web);
    }
    let Some(tenant_id) = tenant_id_from_headers(&headers) else {
        return bad_request("x-sdkwork-tenant-id header is required", web);
    };
    if let Err(response) =
        require_account_for_tenant(&state, tenant_id, account_id, &plugin_code, web).await
    {
        return response;
    }
    match state.host.plugin_runtime().status(account_id).await {
        Ok(data) => ok_resource(data, web).into_response(),
        Err(error) => runtime_error(error, web),
    }
}

async fn send_message(
    State(state): State<InternalState>,
    headers: HeaderMap,
    web_context: Option<Extension<WebRequestContext>>,
    Path((plugin_code, account_id)): Path<(String, Uuid)>,
    Json(body): Json<SendMessageBody>,
) -> Response {
    let web = web_ctx(&web_context);
    if plugin_code.trim().is_empty() {
        return bad_request("pluginCode is required", web);
    }
    if body.external_conversation_id.trim().is_empty() || body.body.trim().is_empty() {
        return bad_request("externalConversationId and body are required", web);
    }
    let Some(tenant_id) = tenant_id_from_headers(&headers) else {
        return bad_request("x-sdkwork-tenant-id header is required", web);
    };
    if let Err(response) =
        require_account_for_tenant(&state, tenant_id, account_id, &plugin_code, web).await
    {
        return response;
    }
    match state
        .host
        .plugin_runtime()
        .send_text(SendChannelTextCommand {
            account_id,
            external_conversation_id: body.external_conversation_id,
            external_recipient_id: body.external_recipient_id,
            body: body.body,
        })
        .await
    {
        Ok(external_message_id) => ok_resource(
            serde_json::json!({ "externalMessageId": external_message_id }),
            web,
        )
        .into_response(),
        Err(error) => runtime_error(error, web),
    }
}

async fn delivery_pre_check(
    State(state): State<InternalState>,
    headers: HeaderMap,
    web_context: Option<Extension<WebRequestContext>>,
    Path((plugin_code, account_id)): Path<(String, Uuid)>,
    Json(body): Json<DeliveryPreCheckBody>,
) -> Response {
    let web = web_ctx(&web_context);
    if plugin_code.trim().is_empty() {
        return bad_request("pluginCode is required", web);
    }
    if body.external_order_id.trim().is_empty() {
        return bad_request("externalOrderId is required", web);
    }
    let Some(tenant_id) = tenant_id_from_headers(&headers) else {
        return bad_request("x-sdkwork-tenant-id header is required", web);
    };
    let account = match state
        .host
        .service()
        .require_channel_account_for_tenant(tenant_id, account_id)
        .await
    {
        Ok(account) => account,
        Err(error) => return service_error(error, web),
    };
    if account.plugin_code != plugin_code {
        return bad_request("pluginCode does not match account plugin", web);
    }
    let ctx = DeliveryCheckContext {
        tenant_id: account.tenant_id,
        account_id,
        order: OrderContext {
            external_order_id: body.external_order_id,
            external_item_id: body.external_item_id,
            buyer_external_id: body.buyer_external_id,
        },
        rule_code: None,
        rule_config: serde_json::json!({}),
        excluded_external_item_ids: Vec::new(),
    };
    match state.host.plugin_ports().run_delivery_pre_check(&ctx).await {
        Ok(action) => ok_resource(
            serde_json::json!({
                "action": delivery_action_name(action),
            }),
            web,
        )
        .into_response(),
        Err(error) => bad_request(&error.to_string(), web).into_response(),
    }
}

fn delivery_action_name(action: DeliveryAction) -> &'static str {
    match action {
        DeliveryAction::Allow => "allow",
        DeliveryAction::Block => "block",
        DeliveryAction::CardOnly => "card_only",
    }
}

#[allow(dead_code)]
fn unavailable(message: &str, web: Option<&WebRequestContext>) -> Response {
    service_unavailable(message, web)
}
