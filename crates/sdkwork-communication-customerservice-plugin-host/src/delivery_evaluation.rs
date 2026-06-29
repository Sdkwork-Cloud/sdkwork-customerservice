use std::sync::Arc;

use async_trait::async_trait;
use sdkwork_communication_customerservice_plugin_spi::{
    DeliveryCheckContext, DeliveryRuleEvaluationPorts, PluginError,
};
use sdkwork_communication_customerservice_service::ChannelPluginRepository;

pub struct ChannelDeliveryRuleEvaluationPorts<R> {
    repository: Arc<R>,
}

impl<R> ChannelDeliveryRuleEvaluationPorts<R> {
    pub fn new(repository: Arc<R>) -> Self {
        Self { repository }
    }
}

#[async_trait]
impl<R> DeliveryRuleEvaluationPorts for ChannelDeliveryRuleEvaluationPorts<R>
where
    R: ChannelPluginRepository + Send + Sync,
{
    async fn count_buyer_orders(
        &self,
        ctx: &DeliveryCheckContext,
        same_item_only: bool,
    ) -> Result<u64, PluginError> {
        let buyer = ctx.order.buyer_external_id.as_deref().ok_or_else(|| {
            PluginError::HostPort(
                "buyerExternalId is required for buyer order delivery rules".to_owned(),
            )
        })?;
        self.repository
            .count_goofish_buyer_orders(
                ctx.tenant_id,
                ctx.account_id,
                buyer,
                &ctx.order.external_order_id,
                if same_item_only {
                    ctx.order.external_item_id.as_deref()
                } else {
                    None
                },
            )
            .await
            .map_err(|error| PluginError::HostPort(error.to_string()))
    }

    async fn count_unconfirmed_buyer_orders(
        &self,
        ctx: &DeliveryCheckContext,
        same_item_only: bool,
    ) -> Result<u64, PluginError> {
        let buyer = ctx.order.buyer_external_id.as_deref().ok_or_else(|| {
            PluginError::HostPort(
                "buyerExternalId is required for unconfirmed order delivery rules".to_owned(),
            )
        })?;
        self.repository
            .count_goofish_unconfirmed_buyer_orders(
                ctx.tenant_id,
                ctx.account_id,
                buyer,
                &ctx.order.external_order_id,
                if same_item_only {
                    ctx.order.external_item_id.as_deref()
                } else {
                    None
                },
            )
            .await
            .map_err(|error| PluginError::HostPort(error.to_string()))
    }
}
