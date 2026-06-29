use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
    Failed,
    Closed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageDirection {
    Inbound,
    Outbound,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageKind {
    Chat,
    Card,
    Order,
    System,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeliveryAction {
    Allow,
    Block,
    CardOnly,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedChannelMessage {
    pub external_message_id: String,
    pub external_conversation_id: String,
    pub external_buyer_id: Option<String>,
    pub external_item_id: Option<String>,
    pub direction: MessageDirection,
    pub message_kind: MessageKind,
    pub body: String,
    pub sender_external_id: Option<String>,
    pub sender_display_name: Option<String>,
    pub occurred_at: DateTime<Utc>,
    pub raw: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawChannelFrame {
    pub payload: Value,
    pub received_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountRuntimeContext {
    pub tenant_id: Uuid,
    pub account_id: Uuid,
    pub plugin_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialSnapshot {
    pub credential_kind: String,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplyContent {
    pub body: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleCheckResult {
    pub hit: bool,
    pub rule_code: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutboundTextRequest {
    pub external_conversation_id: String,
    pub body: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub external_recipient_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutboundMessageResult {
    pub external_message_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConversationRequest {
    pub external_buyer_id: String,
    pub external_item_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderContext {
    pub external_order_id: String,
    pub external_item_id: Option<String>,
    pub buyer_external_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderOverlayUpsert {
    pub external_order_id: String,
    pub external_item_id: Option<String>,
    pub buyer_external_id: Option<String>,
    pub external_conversation_id: Option<String>,
    pub order_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeliveryCheckContext {
    pub tenant_id: Uuid,
    pub account_id: Uuid,
    pub order: OrderContext,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rule_code: Option<String>,
    #[serde(default)]
    pub rule_config: Value,
    #[serde(default)]
    pub excluded_external_item_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginNotificationEvent {
    pub event_type: String,
    pub payload: Value,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PluginCapability {
    SessionCookie,
    SessionCaptcha,
    SessionOauth,
    TransportWebsocket,
    MessageChat,
    MessageCard,
    MessageOrder,
    OrderSync,
    DeliveryAuto,
    DeliveryRuleContribution,
    ReplyKeyword,
    ReplyAi,
    ReplyDefault,
    NotificationOutbound,
}
