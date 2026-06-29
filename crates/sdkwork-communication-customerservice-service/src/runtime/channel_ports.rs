use async_trait::async_trait;
use uuid::Uuid;

use super::channel_domain::{
    AutoReplyRuleSummary, ChannelAccountSummary, ConversationBridgeContext,
    CreateAutoReplyRuleCommand, CreateChannelAccountCommand, DeliveryBlockRuleSummary,
    PersistChannelMessageCommand, PluginCatalogEntry, PluginEnablementSummary,
    UpdateAutoReplyRuleCommand, UpdateChannelAccountCommand, UpsertChannelCredentialCommand,
    UpsertDeliveryBlockRuleItem, UpsertGoofishOrderOverlayCommand, UpsertPluginEnablementCommand,
};
use crate::CustomerServiceError;

#[async_trait]
pub trait ChannelPluginRepository: Send + Sync {
    async fn list_plugin_catalog(&self) -> Result<Vec<PluginCatalogEntry>, CustomerServiceError>;

    async fn list_channel_accounts(
        &self,
        tenant_id: Uuid,
        plugin_code: Option<&str>,
        limit: u32,
        offset: u32,
    ) -> Result<(Vec<ChannelAccountSummary>, u64), CustomerServiceError>;

    async fn get_conversation_bridge_context(
        &self,
        conversation_id: Uuid,
    ) -> Result<Option<ConversationBridgeContext>, CustomerServiceError>;

    async fn ensure_conversation(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        external_conversation_id: &str,
        external_buyer_id: Option<&str>,
        external_item_id: Option<&str>,
        subject: Option<&str>,
    ) -> Result<Uuid, CustomerServiceError>;

    async fn get_conversation_external_buyer(
        &self,
        account_id: Uuid,
        external_conversation_id: &str,
    ) -> Result<Option<String>, CustomerServiceError>;

    async fn persist_channel_message(
        &self,
        command: PersistChannelMessageCommand,
    ) -> Result<Uuid, CustomerServiceError>;

    async fn link_conversation_ticket(
        &self,
        tenant_id: Uuid,
        conversation_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<(), CustomerServiceError>;

    async fn create_channel_account(
        &self,
        command: CreateChannelAccountCommand,
    ) -> Result<ChannelAccountSummary, CustomerServiceError>;

    async fn get_channel_account_by_id(
        &self,
        account_id: Uuid,
    ) -> Result<Option<ChannelAccountSummary>, CustomerServiceError>;

    async fn upsert_channel_credential(
        &self,
        command: UpsertChannelCredentialCommand,
    ) -> Result<(), CustomerServiceError>;

    async fn load_channel_credential(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        credential_kind: &str,
    ) -> Result<Option<String>, CustomerServiceError>;

    async fn update_channel_account_runtime_state(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        connection_state: &str,
        last_error_code: Option<&str>,
        last_error_message: Option<&str>,
    ) -> Result<(), CustomerServiceError>;

    async fn list_auto_reply_rules(
        &self,
        tenant_id: Uuid,
        plugin_code: Option<&str>,
        account_id: Option<Uuid>,
        limit: u32,
        offset: u32,
    ) -> Result<(Vec<AutoReplyRuleSummary>, u64), CustomerServiceError>;

    async fn create_auto_reply_rule(
        &self,
        command: CreateAutoReplyRuleCommand,
    ) -> Result<AutoReplyRuleSummary, CustomerServiceError>;

    async fn update_channel_account(
        &self,
        command: UpdateChannelAccountCommand,
    ) -> Result<ChannelAccountSummary, CustomerServiceError>;

    async fn update_auto_reply_rule(
        &self,
        command: UpdateAutoReplyRuleCommand,
    ) -> Result<AutoReplyRuleSummary, CustomerServiceError>;

    async fn delete_auto_reply_rule(
        &self,
        tenant_id: Uuid,
        rule_id: Uuid,
    ) -> Result<(), CustomerServiceError>;

    async fn list_delivery_block_rules_for_account(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
    ) -> Result<Vec<DeliveryBlockRuleSummary>, CustomerServiceError>;

    async fn upsert_delivery_block_rules(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        plugin_code: &str,
        items: Vec<UpsertDeliveryBlockRuleItem>,
    ) -> Result<Vec<DeliveryBlockRuleSummary>, CustomerServiceError>;

    async fn list_plugin_enablement_for_tenant(
        &self,
        tenant_id: Uuid,
    ) -> Result<Vec<PluginEnablementSummary>, CustomerServiceError>;

    async fn upsert_plugin_enablement(
        &self,
        command: UpsertPluginEnablementCommand,
    ) -> Result<PluginEnablementSummary, CustomerServiceError>;

    async fn count_goofish_buyer_orders(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        buyer_external_id: &str,
        exclude_external_order_id: &str,
        external_item_id: Option<&str>,
    ) -> Result<u64, CustomerServiceError>;

    async fn count_goofish_unconfirmed_buyer_orders(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        buyer_external_id: &str,
        exclude_external_order_id: &str,
        external_item_id: Option<&str>,
    ) -> Result<u64, CustomerServiceError>;

    async fn upsert_goofish_order_overlay(
        &self,
        command: UpsertGoofishOrderOverlayCommand,
    ) -> Result<Uuid, CustomerServiceError>;

    async fn delete_channel_account(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
    ) -> Result<(), CustomerServiceError>;
}
