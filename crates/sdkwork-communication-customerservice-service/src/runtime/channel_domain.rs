use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginCatalogEntry {
    pub id: Uuid,
    pub plugin_code: String,
    pub display_name: String,
    pub version: String,
    pub capabilities: Value,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tenant_enabled: Option<bool>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PluginEnablementSummary {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub plugin_code: String,
    pub enabled: bool,
    pub config: Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpsertPluginEnablementCommand {
    pub tenant_id: Uuid,
    pub plugin_code: String,
    pub enabled: bool,
    pub config: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ChannelAccountSummary {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Option<Uuid>,
    pub plugin_code: String,
    pub external_account_id: Option<String>,
    pub display_name: String,
    pub status: String,
    pub enabled: bool,
    pub owner_user_id: Uuid,
    pub connection_state: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CreateChannelAccountCommand {
    pub tenant_id: Uuid,
    pub organization_id: Option<Uuid>,
    pub plugin_code: String,
    pub display_name: String,
    pub owner_user_id: Uuid,
    pub external_account_id: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ConversationBridgeContext {
    pub tenant_id: Uuid,
    pub organization_id: Option<Uuid>,
    pub account_id: Uuid,
    pub plugin_code: String,
    pub owner_user_id: Uuid,
    pub external_conversation_id: String,
    pub subject: Option<String>,
    pub ticket_id: Option<Uuid>,
}

#[derive(Debug, Clone)]
pub struct PersistChannelMessageCommand {
    pub tenant_id: Uuid,
    pub conversation_id: Uuid,
    pub external_message_id: String,
    pub direction: String,
    pub message_kind: String,
    pub body: String,
    pub raw_payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpsertChannelCredentialCommand {
    pub tenant_id: Uuid,
    pub account_id: Uuid,
    pub credential_kind: String,
    pub payload: Vec<u8>,
    pub key_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AutoReplyRuleSummary {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub account_id: Option<Uuid>,
    pub plugin_code: String,
    pub rule_kind: String,
    pub priority: i32,
    pub enabled: bool,
    pub match_pattern: Option<String>,
    pub reply_content: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CreateAutoReplyRuleCommand {
    pub tenant_id: Uuid,
    pub account_id: Option<Uuid>,
    pub plugin_code: String,
    pub rule_kind: String,
    pub priority: Option<i32>,
    pub enabled: Option<bool>,
    pub match_pattern: Option<String>,
    pub reply_content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateChannelAccountCommand {
    pub tenant_id: Uuid,
    pub account_id: Uuid,
    pub display_name: Option<String>,
    pub enabled: Option<bool>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAutoReplyRuleCommand {
    pub tenant_id: Uuid,
    pub rule_id: Uuid,
    pub priority: Option<i32>,
    pub enabled: Option<bool>,
    pub match_pattern: Option<String>,
    pub reply_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DeliveryBlockRuleCatalogEntry {
    pub rule_code: String,
    pub rule_name: String,
    pub rule_description: String,
    pub default_priority: i32,
    pub default_action_config: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DeliveryBlockRuleSummary {
    pub id: Option<Uuid>,
    pub rule_code: String,
    pub rule_name: String,
    pub rule_description: String,
    pub enabled: bool,
    pub priority: i32,
    pub excluded_external_item_ids: Vec<String>,
    pub action_config: serde_json::Value,
    pub default_action_config: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpsertDeliveryBlockRuleItem {
    pub rule_code: String,
    pub enabled: bool,
    pub priority: i32,
    pub excluded_external_item_ids: Option<Vec<String>>,
    pub action_config: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpsertGoofishOrderOverlayCommand {
    pub tenant_id: Uuid,
    pub account_id: Uuid,
    pub conversation_id: Option<Uuid>,
    pub external_order_id: String,
    pub external_item_id: Option<String>,
    pub buyer_external_id: Option<String>,
    pub order_status: String,
}

pub fn goofish_order_status_rank(status: &str) -> u8 {
    match status {
        "cancelled" => 0,
        "pending_payment" => 1,
        "pending_ship" => 2,
        "shipped" => 3,
        "completed" => 4,
        _ => 1,
    }
}

pub fn goofish_delivery_block_rule_catalog() -> Vec<DeliveryBlockRuleCatalogEntry> {
    vec![
        DeliveryBlockRuleCatalogEntry {
            rule_code: "personal_blacklist".to_owned(),
            rule_name: "个人黑名单".to_owned(),
            rule_description: "买家在个人黑名单中时禁止发货".to_owned(),
            default_priority: 5,
            default_action_config: serde_json::json!({}),
        },
        DeliveryBlockRuleCatalogEntry {
            rule_code: "buyer_credit".to_owned(),
            rule_name: "买家信用度检查".to_owned(),
            rule_description: "买家评价数低于阈值时禁止发货".to_owned(),
            default_priority: 10,
            default_action_config: serde_json::json!({ "threshold": 0 }),
        },
        DeliveryBlockRuleCatalogEntry {
            rule_code: "buyer_has_order".to_owned(),
            rule_name: "买家已有订单".to_owned(),
            rule_description: "买家在当前卖家下已有其他订单时禁止发货".to_owned(),
            default_priority: 20,
            default_action_config: serde_json::json!({ "sameItemOnly": false }),
        },
        DeliveryBlockRuleCatalogEntry {
            rule_code: "buyer_unconfirmed".to_owned(),
            rule_name: "买家存在未确认收货订单".to_owned(),
            rule_description: "买家有未确认收货订单时禁止发货".to_owned(),
            default_priority: 30,
            default_action_config: serde_json::json!({ "minCount": 1, "sameItemOnly": false }),
        },
    ]
}
