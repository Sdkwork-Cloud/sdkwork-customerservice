use std::sync::Arc;

use async_trait::async_trait;
use sdkwork_communication_customerservice_plugin_spi::{
    DeliveryCheckContext, DeliveryRule, DeliveryRuleEvaluationPorts, DeliveryRuleRegistry,
    PluginError, RuleCheckResult,
};

/// Registry-backed delivery block rules (reference: `delivery_rules/rule_registry.py`).
pub struct GoofishDeliveryRuleContributions;

impl GoofishDeliveryRuleContributions {
    pub fn rule_codes(&self) -> &'static [&'static str] {
        &[
            "buyer_credit",
            "buyer_has_order",
            "buyer_unconfirmed",
            "personal_blacklist",
        ]
    }
}

fn config_bool(value: &serde_json::Value, camel: &str, snake: &str, default: bool) -> bool {
    value
        .get(camel)
        .or_else(|| value.get(snake))
        .and_then(|entry| entry.as_bool())
        .unwrap_or(default)
}

fn config_u64(value: &serde_json::Value, camel: &str, snake: &str, default: u64) -> u64 {
    value
        .get(camel)
        .or_else(|| value.get(snake))
        .and_then(|entry| entry.as_u64())
        .unwrap_or(default)
}

fn miss(rule_code: &str) -> RuleCheckResult {
    RuleCheckResult {
        hit: false,
        rule_code: Some(rule_code.to_owned()),
        reason: None,
    }
}

fn hit(rule_code: &str, reason: impl Into<String>) -> RuleCheckResult {
    RuleCheckResult {
        hit: true,
        rule_code: Some(rule_code.to_owned()),
        reason: Some(reason.into()),
    }
}

pub struct BuyerCreditRule;

#[async_trait]
impl DeliveryRule for BuyerCreditRule {
    fn rule_code(&self) -> &'static str {
        "buyer_credit"
    }

    async fn evaluate(&self, _ctx: &DeliveryCheckContext) -> Result<RuleCheckResult, PluginError> {
        // External Goofish credit API is not wired yet; fail-open until rate lookup ports exist.
        Ok(miss(self.rule_code()))
    }
}

pub struct BuyerHasOrderRule {
    ports: Arc<dyn DeliveryRuleEvaluationPorts>,
}

impl BuyerHasOrderRule {
    pub fn new(ports: Arc<dyn DeliveryRuleEvaluationPorts>) -> Self {
        Self { ports }
    }
}

#[async_trait]
impl DeliveryRule for BuyerHasOrderRule {
    fn rule_code(&self) -> &'static str {
        "buyer_has_order"
    }

    async fn evaluate(&self, ctx: &DeliveryCheckContext) -> Result<RuleCheckResult, PluginError> {
        if ctx.order.buyer_external_id.is_none() {
            return Ok(miss(self.rule_code()));
        }
        let same_item_only = config_bool(&ctx.rule_config, "sameItemOnly", "same_item_only", false);
        let order_count = match self.ports.count_buyer_orders(ctx, same_item_only).await {
            Ok(count) => count,
            Err(_) => return Ok(miss(self.rule_code())),
        };
        if order_count > 0 {
            return Ok(hit(
                self.rule_code(),
                format!("买家已有{order_count}笔其他订单，禁止发货"),
            ));
        }
        Ok(miss(self.rule_code()))
    }
}

pub struct BuyerUnconfirmedRule {
    ports: Arc<dyn DeliveryRuleEvaluationPorts>,
}

impl BuyerUnconfirmedRule {
    pub fn new(ports: Arc<dyn DeliveryRuleEvaluationPorts>) -> Self {
        Self { ports }
    }
}

#[async_trait]
impl DeliveryRule for BuyerUnconfirmedRule {
    fn rule_code(&self) -> &'static str {
        "buyer_unconfirmed"
    }

    async fn evaluate(&self, ctx: &DeliveryCheckContext) -> Result<RuleCheckResult, PluginError> {
        if ctx.order.buyer_external_id.is_none() {
            return Ok(miss(self.rule_code()));
        }
        let min_count = config_u64(&ctx.rule_config, "minCount", "min_count", 1);
        let same_item_only = config_bool(&ctx.rule_config, "sameItemOnly", "same_item_only", false);
        let unconfirmed_count = match self
            .ports
            .count_unconfirmed_buyer_orders(ctx, same_item_only)
            .await
        {
            Ok(count) => count,
            Err(_) => return Ok(miss(self.rule_code())),
        };
        if unconfirmed_count >= min_count {
            return Ok(hit(
                self.rule_code(),
                format!("买家有{unconfirmed_count}笔未确认收货订单，禁止发货"),
            ));
        }
        Ok(miss(self.rule_code()))
    }
}

pub struct PersonalBlacklistRule;

#[async_trait]
impl DeliveryRule for PersonalBlacklistRule {
    fn rule_code(&self) -> &'static str {
        "personal_blacklist"
    }

    async fn evaluate(&self, ctx: &DeliveryCheckContext) -> Result<RuleCheckResult, PluginError> {
        let Some(buyer) = ctx.order.buyer_external_id.as_deref() else {
            return Ok(miss(self.rule_code()));
        };
        let blacklist = ctx
            .rule_config
            .get("blacklistBuyerIds")
            .or_else(|| ctx.rule_config.get("blacklist_buyer_ids"));
        if let Some(ids) = blacklist.and_then(|value| value.as_array()) {
            for entry in ids {
                if entry.as_str() == Some(buyer) {
                    return Ok(hit(self.rule_code(), "买家在个人黑名单中"));
                }
            }
        }
        Ok(miss(self.rule_code()))
    }
}

pub struct GoofishDeliveryRuleRegistry {
    ports: Arc<dyn DeliveryRuleEvaluationPorts>,
}

impl GoofishDeliveryRuleRegistry {
    pub fn new(ports: Arc<dyn DeliveryRuleEvaluationPorts>) -> Self {
        Self { ports }
    }
}

impl DeliveryRuleRegistry for GoofishDeliveryRuleRegistry {
    fn get(&self, rule_code: &str) -> Option<Arc<dyn DeliveryRule>> {
        match rule_code {
            "buyer_credit" => Some(Arc::new(BuyerCreditRule)),
            "buyer_has_order" => Some(Arc::new(BuyerHasOrderRule::new(Arc::clone(&self.ports)))),
            "buyer_unconfirmed" => {
                Some(Arc::new(BuyerUnconfirmedRule::new(Arc::clone(&self.ports))))
            }
            "personal_blacklist" => Some(Arc::new(PersonalBlacklistRule)),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use uuid::Uuid;

    struct MockPorts {
        buyer_orders: u64,
        unconfirmed_orders: u64,
    }

    #[async_trait]
    impl DeliveryRuleEvaluationPorts for MockPorts {
        async fn count_buyer_orders(
            &self,
            _ctx: &DeliveryCheckContext,
            _same_item_only: bool,
        ) -> Result<u64, PluginError> {
            Ok(self.buyer_orders)
        }

        async fn count_unconfirmed_buyer_orders(
            &self,
            _ctx: &DeliveryCheckContext,
            _same_item_only: bool,
        ) -> Result<u64, PluginError> {
            Ok(self.unconfirmed_orders)
        }
    }

    fn sample_ctx(rule_config: serde_json::Value) -> DeliveryCheckContext {
        DeliveryCheckContext {
            tenant_id: Uuid::new_v4(),
            account_id: Uuid::new_v4(),
            order: sdkwork_communication_customerservice_plugin_spi::OrderContext {
                external_order_id: "order-1".to_owned(),
                external_item_id: Some("item-1".to_owned()),
                buyer_external_id: Some("buyer-1".to_owned()),
            },
            rule_code: None,
            rule_config,
            excluded_external_item_ids: Vec::new(),
        }
    }

    #[tokio::test]
    async fn buyer_has_order_hits_when_other_orders_exist() {
        let rule = BuyerHasOrderRule::new(Arc::new(MockPorts {
            buyer_orders: 2,
            unconfirmed_orders: 0,
        }));
        let result = rule.evaluate(&sample_ctx(json!({}))).await.unwrap();
        assert!(result.hit);
    }

    #[tokio::test]
    async fn buyer_unconfirmed_respects_min_count() {
        let rule = BuyerUnconfirmedRule::new(Arc::new(MockPorts {
            buyer_orders: 0,
            unconfirmed_orders: 1,
        }));
        let result = rule
            .evaluate(&sample_ctx(json!({ "minCount": 2 })))
            .await
            .unwrap();
        assert!(!result.hit);

        let result = rule
            .evaluate(&sample_ctx(json!({ "minCount": 1 })))
            .await
            .unwrap();
        assert!(result.hit);
    }

    #[tokio::test]
    async fn personal_blacklist_hits_configured_buyer() {
        let rule = PersonalBlacklistRule;
        let result = rule
            .evaluate(&sample_ctx(json!({ "blacklistBuyerIds": ["buyer-1"] })))
            .await
            .unwrap();
        assert!(result.hit);
    }

    #[tokio::test]
    async fn registry_exposes_all_goofish_rules() {
        let registry = GoofishDeliveryRuleRegistry::new(Arc::new(MockPorts {
            buyer_orders: 0,
            unconfirmed_orders: 0,
        }));
        for code in GoofishDeliveryRuleContributions.rule_codes() {
            assert!(registry.get(code).is_some(), "missing rule {code}");
        }
    }
}
