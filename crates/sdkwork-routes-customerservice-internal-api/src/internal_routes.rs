use axum::extract::{Path, State};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use sdkwork_communication_customerservice_plugin_runtime::{
    PluginRuntimeError, SendChannelTextCommand,
};
use sdkwork_communication_customerservice_plugin_spi::{
    DeliveryAction, DeliveryCheckContext, OrderContext,
};
use sdkwork_customerservice_service_host::CustomerServiceHost;
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::ingress_auth::with_ingress_auth;
use crate::response::{
    bad_request, conflict, internal_error, not_found, ok_resource, service_error,
};

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

async fn start_account(
    State(state): State<InternalState>,
    Path((plugin_code, account_id)): Path<(String, Uuid)>,
) -> Response {
    if plugin_code.trim().is_empty() {
        return bad_request("pluginCode is required");
    }
    match state.host.plugin_runtime().start_account(account_id).await {
        Ok(data) => {
            if data.plugin_code != plugin_code {
                return bad_request("pluginCode does not match account plugin");
            }
            ok_resource(data).into_response()
        }
        Err(error) => runtime_error(error),
    }
}

async fn stop_account(
    State(state): State<InternalState>,
    Path((plugin_code, account_id)): Path<(String, Uuid)>,
) -> Response {
    if plugin_code.trim().is_empty() {
        return bad_request("pluginCode is required");
    }
    match state.host.plugin_runtime().stop_account(account_id).await {
        Ok(data) => {
            if data.plugin_code != plugin_code {
                return bad_request("pluginCode does not match account plugin");
            }
            ok_resource(data).into_response()
        }
        Err(error) => runtime_error(error),
    }
}

async fn account_status(
    State(state): State<InternalState>,
    Path((plugin_code, account_id)): Path<(String, Uuid)>,
) -> Response {
    if plugin_code.trim().is_empty() {
        return bad_request("pluginCode is required");
    }
    match state.host.plugin_runtime().status(account_id).await {
        Ok(data) => {
            if data.plugin_code != plugin_code {
                return bad_request("pluginCode does not match account plugin");
            }
            ok_resource(data).into_response()
        }
        Err(error) => runtime_error(error),
    }
}

async fn send_message(
    State(state): State<InternalState>,
    Path((plugin_code, account_id)): Path<(String, Uuid)>,
    Json(body): Json<SendMessageBody>,
) -> Response {
    if plugin_code.trim().is_empty() {
        return bad_request("pluginCode is required");
    }
    if body.external_conversation_id.trim().is_empty() || body.body.trim().is_empty() {
        return bad_request("externalConversationId and body are required");
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
        Ok(external_message_id) => {
            ok_resource(serde_json::json!({ "externalMessageId": external_message_id }))
                .into_response()
        }
        Err(error) => runtime_error(error),
    }
}

async fn delivery_pre_check(
    State(state): State<InternalState>,
    Path((plugin_code, account_id)): Path<(String, Uuid)>,
    Json(body): Json<DeliveryPreCheckBody>,
) -> Response {
    if plugin_code.trim().is_empty() {
        return bad_request("pluginCode is required");
    }
    if body.external_order_id.trim().is_empty() {
        return bad_request("externalOrderId is required");
    }
    let account = match state
        .host
        .service()
        .get_channel_account_by_id(account_id)
        .await
    {
        Ok(Some(account)) => account,
        Ok(None) => return not_found("channel account not found"),
        Err(error) => return service_error(error),
    };
    if account.plugin_code != plugin_code {
        return bad_request("pluginCode does not match account plugin");
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
        Ok(action) => ok_resource(serde_json::json!({
            "action": delivery_action_name(action),
        }))
        .into_response(),
        Err(error) => bad_request(&error.to_string()).into_response(),
    }
}

fn delivery_action_name(action: DeliveryAction) -> &'static str {
    match action {
        DeliveryAction::Allow => "allow",
        DeliveryAction::Block => "block",
        DeliveryAction::CardOnly => "card_only",
    }
}

fn runtime_error(error: PluginRuntimeError) -> Response {
    match error {
        PluginRuntimeError::AccountNotFound => not_found("channel account not found"),
        PluginRuntimeError::RuntimeNotActive => conflict("account runtime is not active"),
        PluginRuntimeError::SessionNotConfigured(message) => bad_request(&message),
        PluginRuntimeError::PluginNotFound(message) => bad_request(&message),
        other => internal_error(other.to_string()),
    }
}
