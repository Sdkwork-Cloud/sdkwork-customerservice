use async_trait::async_trait;
use uuid::Uuid;

use crate::model::{
    AccountRuntimeContext, DeliveryAction, DeliveryCheckContext, NormalizedChannelMessage,
    OrderOverlayUpsert, PluginNotificationEvent, ReplyContent,
};
use crate::PluginError;

#[async_trait]
pub trait PluginHostPorts: Send + Sync {
    async fn persist_inbound_message(
        &self,
        ctx: &AccountRuntimeContext,
        msg: NormalizedChannelMessage,
    ) -> Result<Uuid, PluginError>;

    async fn bridge_to_ticket(&self, conversation_id: Uuid) -> Result<Uuid, PluginError>;

    async fn run_auto_reply(
        &self,
        ctx: &AccountRuntimeContext,
        msg: &NormalizedChannelMessage,
    ) -> Result<Option<ReplyContent>, PluginError> {
        let _ = (ctx, msg);
        Ok(None)
    }

    async fn run_delivery_pre_check(
        &self,
        _ctx: &DeliveryCheckContext,
    ) -> Result<DeliveryAction, PluginError> {
        Ok(DeliveryAction::Allow)
    }

    async fn upsert_order_overlay(
        &self,
        _ctx: &AccountRuntimeContext,
        _order: OrderOverlayUpsert,
    ) -> Result<Uuid, PluginError> {
        Err(PluginError::CapabilityNotSupported(
            "order overlay upsert".to_owned(),
        ))
    }

    async fn emit_notification(&self, _event: PluginNotificationEvent) -> Result<(), PluginError> {
        Ok(())
    }
}
