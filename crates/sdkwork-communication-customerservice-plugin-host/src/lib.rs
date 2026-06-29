mod delivery_evaluation;

use std::collections::HashMap;
use std::sync::Arc;

pub use delivery_evaluation::ChannelDeliveryRuleEvaluationPorts;

use async_trait::async_trait;
use sdkwork_communication_customerservice_plugin_spi::{
    AccountRuntimeContext, DeliveryAction, DeliveryCheckContext, DeliveryRuleRegistry,
    MessageDirection, MessageKind, NormalizedChannelMessage, PluginError, PluginHostPorts,
    ReplyContent,
};
use sdkwork_communication_customerservice_service::{
    ChannelPluginRepository, CreateTicketCommand, CustomerServiceRepository,
    CustomerServiceService, PersistChannelMessageCommand,
};
use uuid::Uuid;

pub struct ChannelPluginHost<R>
where
    R: CustomerServiceRepository + ChannelPluginRepository + Send + Sync,
{
    repository: R,
    service: Arc<CustomerServiceService<R>>,
    delivery_registries: HashMap<String, Arc<dyn DeliveryRuleRegistry>>,
}

impl<R> ChannelPluginHost<R>
where
    R: CustomerServiceRepository + ChannelPluginRepository + Send + Sync,
{
    pub fn new(
        repository: R,
        service: Arc<CustomerServiceService<R>>,
        delivery_registries: HashMap<String, Arc<dyn DeliveryRuleRegistry>>,
    ) -> Self {
        Self {
            repository,
            service,
            delivery_registries,
        }
    }
}

#[async_trait]
impl<R> PluginHostPorts for ChannelPluginHost<R>
where
    R: CustomerServiceRepository + ChannelPluginRepository + Send + Sync,
{
    async fn persist_inbound_message(
        &self,
        ctx: &AccountRuntimeContext,
        msg: NormalizedChannelMessage,
    ) -> Result<Uuid, PluginError> {
        let subject = msg
            .sender_display_name
            .clone()
            .or_else(|| msg.external_buyer_id.clone());

        let conversation_id = self
            .repository
            .ensure_conversation(
                ctx.tenant_id,
                ctx.account_id,
                &msg.external_conversation_id,
                msg.external_buyer_id.as_deref(),
                msg.external_item_id.as_deref(),
                subject.as_deref(),
            )
            .await
            .map_err(|error| PluginError::HostPort(error.to_string()))?;

        let direction = match msg.direction {
            MessageDirection::Inbound => "inbound",
            MessageDirection::Outbound => "outbound",
        };
        let message_kind = match msg.message_kind {
            MessageKind::Chat => "chat",
            MessageKind::Card => "card",
            MessageKind::Order => "order",
            MessageKind::System => "system",
        };

        let message_id = self
            .repository
            .persist_channel_message(PersistChannelMessageCommand {
                tenant_id: ctx.tenant_id,
                conversation_id,
                external_message_id: msg.external_message_id,
                direction: direction.to_owned(),
                message_kind: message_kind.to_owned(),
                body: msg.body.clone(),
                raw_payload: msg.raw.clone(),
            })
            .await
            .map_err(|error| PluginError::HostPort(error.to_string()))?;

        if msg.direction == MessageDirection::Inbound {
            let _ = self.bridge_to_ticket(conversation_id).await;
        }

        Ok(message_id)
    }

    async fn run_auto_reply(
        &self,
        ctx: &AccountRuntimeContext,
        msg: &NormalizedChannelMessage,
    ) -> Result<Option<ReplyContent>, PluginError> {
        if msg.direction != MessageDirection::Inbound {
            return Ok(None);
        }

        let (rules, _) = self
            .repository
            .list_auto_reply_rules(
                ctx.tenant_id,
                Some(ctx.plugin_code.as_str()),
                Some(ctx.account_id),
                100,
                0,
            )
            .await
            .map_err(|error| PluginError::HostPort(error.to_string()))?;

        for rule in rules {
            if !rule.enabled || rule.rule_kind != "keyword" {
                continue;
            }
            let Some(pattern) = rule.match_pattern.as_deref() else {
                continue;
            };
            if pattern.is_empty() {
                continue;
            }
            if msg.body.contains(pattern) {
                if let Some(body) = rule.reply_content {
                    return Ok(Some(ReplyContent { body }));
                }
            }
        }

        Ok(None)
    }

    async fn run_delivery_pre_check(
        &self,
        ctx: &DeliveryCheckContext,
    ) -> Result<DeliveryAction, PluginError> {
        let account = self
            .repository
            .get_channel_account_by_id(ctx.account_id)
            .await
            .map_err(|error| PluginError::HostPort(error.to_string()))?
            .filter(|summary| summary.tenant_id == ctx.tenant_id)
            .ok_or_else(|| PluginError::HostPort("channel account not found".to_owned()))?;

        let Some(registry) = self.delivery_registries.get(&account.plugin_code) else {
            return Ok(DeliveryAction::Allow);
        };

        let rules = self
            .repository
            .list_delivery_block_rules_for_account(ctx.tenant_id, ctx.account_id)
            .await
            .map_err(|error| PluginError::HostPort(error.to_string()))?;

        for rule in rules {
            if !rule.enabled {
                continue;
            }
            if let Some(item_id) = ctx.order.external_item_id.as_deref() {
                if rule
                    .excluded_external_item_ids
                    .iter()
                    .any(|excluded| excluded == item_id)
                {
                    continue;
                }
            }
            let Some(evaluator) = registry.get(&rule.rule_code) else {
                continue;
            };
            let rule_ctx = DeliveryCheckContext {
                tenant_id: ctx.tenant_id,
                account_id: ctx.account_id,
                order: ctx.order.clone(),
                rule_code: Some(rule.rule_code.clone()),
                rule_config: rule.action_config.clone(),
                excluded_external_item_ids: rule.excluded_external_item_ids.clone(),
            };
            let result = evaluator
                .evaluate(&rule_ctx)
                .await
                .map_err(|error| PluginError::HostPort(error.to_string()))?;
            if result.hit {
                let only_card = rule
                    .action_config
                    .get("onlyCardAfterClose")
                    .and_then(|value| value.as_bool())
                    .unwrap_or(false);
                return Ok(if only_card {
                    DeliveryAction::CardOnly
                } else {
                    DeliveryAction::Block
                });
            }
        }

        Ok(DeliveryAction::Allow)
    }

    async fn bridge_to_ticket(&self, conversation_id: Uuid) -> Result<Uuid, PluginError> {
        let context = self
            .repository
            .get_conversation_bridge_context(conversation_id)
            .await
            .map_err(|error| PluginError::HostPort(error.to_string()))?
            .ok_or_else(|| PluginError::HostPort("conversation not found".to_owned()))?;

        if let Some(ticket_id) = context.ticket_id {
            return Ok(ticket_id);
        }

        let subject = context.subject.unwrap_or_else(|| {
            format!(
                "Channel {} / {}",
                context.plugin_code, context.external_conversation_id
            )
        });

        let detail = self
            .service
            .create_ticket(CreateTicketCommand {
                tenant_id: context.tenant_id,
                organization_id: context.organization_id,
                requester_user_id: context.owner_user_id,
                subject,
                body: "Channel conversation opened".to_owned(),
                priority: Some("normal".to_owned()),
                channel: Some(context.plugin_code),
            })
            .await
            .map_err(|error| PluginError::HostPort(error.to_string()))?;

        self.repository
            .link_conversation_ticket(context.tenant_id, conversation_id, detail.summary.id)
            .await
            .map_err(|error| PluginError::HostPort(error.to_string()))?;

        Ok(detail.summary.id)
    }
}
