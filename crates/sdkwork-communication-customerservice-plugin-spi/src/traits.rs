use async_trait::async_trait;
use std::sync::Arc;

use crate::model::{
    AccountRuntimeContext, ConnectionState, CreateConversationRequest, DeliveryAction,
    DeliveryCheckContext, NormalizedChannelMessage, OrderContext, OutboundMessageResult,
    OutboundTextRequest, PluginCapability, PluginNotificationEvent, RawChannelFrame, ReplyContent,
    RuleCheckResult,
};
use crate::ports::PluginHostPorts;
use crate::PluginError;

#[async_trait]
pub trait DeliveryRuleEvaluationPorts: Send + Sync {
    async fn count_buyer_orders(
        &self,
        ctx: &DeliveryCheckContext,
        same_item_only: bool,
    ) -> Result<u64, PluginError>;

    async fn count_unconfirmed_buyer_orders(
        &self,
        ctx: &DeliveryCheckContext,
        same_item_only: bool,
    ) -> Result<u64, PluginError>;
}

#[async_trait]
pub trait ChannelPlugin: Send + Sync {
    fn plugin_code(&self) -> &'static str;
    fn capabilities(&self) -> &[PluginCapability];
    fn create_account_runtime(
        &self,
        ctx: AccountRuntimeContext,
        host: Arc<dyn PluginHostPorts>,
    ) -> Result<Box<dyn AccountRuntime>, PluginError>;
}

#[async_trait]
pub trait AccountRuntime: Send + Sync {
    async fn start(&mut self) -> Result<(), PluginError>;
    async fn stop(&mut self) -> Result<(), PluginError>;
    fn connection_state(&self) -> ConnectionState;

    async fn send_text(
        &self,
        _req: OutboundTextRequest,
    ) -> Result<OutboundMessageResult, PluginError> {
        Err(PluginError::CapabilityNotSupported(
            "outbound text".to_owned(),
        ))
    }
}

#[async_trait]
pub trait MessageTransport: Send + Sync {
    async fn send_text(
        &self,
        req: OutboundTextRequest,
    ) -> Result<OutboundMessageResult, PluginError>;

    async fn create_conversation(
        &self,
        req: CreateConversationRequest,
    ) -> Result<String, PluginError>;
}

pub trait MessageIngestAdapter: Send + Sync {
    fn normalize(&self, raw: &RawChannelFrame) -> Result<NormalizedChannelMessage, PluginError>;
}

#[async_trait]
pub trait AutoReplyEngine: Send + Sync {
    async fn compose_reply(
        &self,
        msg: &NormalizedChannelMessage,
    ) -> Result<Option<ReplyContent>, PluginError>;
}

#[async_trait]
pub trait DeliveryRule: Send + Sync {
    fn rule_code(&self) -> &'static str;
    async fn evaluate(&self, ctx: &DeliveryCheckContext) -> Result<RuleCheckResult, PluginError>;
}

#[async_trait]
pub trait DeliveryPipeline: Send + Sync {
    async fn pre_check(&self, order: &OrderContext) -> Result<DeliveryAction, PluginError>;
}

#[async_trait]
pub trait NotificationDispatcher: Send + Sync {
    async fn emit(&self, event: PluginNotificationEvent) -> Result<(), PluginError>;
}

pub trait DeliveryRuleRegistry: Send + Sync {
    fn get(&self, rule_code: &str) -> Option<Arc<dyn DeliveryRule>>;
}
