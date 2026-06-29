mod manager;

use std::collections::HashMap;
use std::sync::Arc;

use sdkwork_communication_customerservice_plugin_spi::DeliveryRuleEvaluationPorts;
use sdkwork_communication_customerservice_plugin_spi::DeliveryRuleRegistry;
use sdkwork_customerservice_plugin_goofish::GoofishDeliveryRuleRegistry;

pub use manager::{
    AccountRuntimeStatus, PluginRuntimeError, PluginRuntimeManager, SendChannelTextCommand,
};

pub fn default_delivery_rule_registries(
    ports: Arc<dyn DeliveryRuleEvaluationPorts>,
) -> HashMap<String, Arc<dyn DeliveryRuleRegistry>> {
    let mut registries: HashMap<String, Arc<dyn DeliveryRuleRegistry>> = HashMap::new();
    registries.insert(
        "goofish".to_owned(),
        Arc::new(GoofishDeliveryRuleRegistry::new(ports)),
    );
    registries
}
