use std::sync::Arc;

use sdkwork_communication_customerservice_plugin_spi::{
    AccountRuntime, AccountRuntimeContext, ChannelPlugin, PluginCapability, PluginError,
    PluginHostPorts,
};

use crate::account_runtime::GoofishAccountRuntime;

pub struct GoofishChannelPlugin;

const GOOFISH_CAPABILITIES: &[PluginCapability] = &[
    PluginCapability::SessionCookie,
    PluginCapability::SessionCaptcha,
    PluginCapability::TransportWebsocket,
    PluginCapability::MessageChat,
    PluginCapability::MessageCard,
    PluginCapability::MessageOrder,
    PluginCapability::OrderSync,
    PluginCapability::DeliveryAuto,
    PluginCapability::DeliveryRuleContribution,
    PluginCapability::ReplyKeyword,
    PluginCapability::ReplyAi,
    PluginCapability::ReplyDefault,
    PluginCapability::NotificationOutbound,
];

impl ChannelPlugin for GoofishChannelPlugin {
    fn plugin_code(&self) -> &'static str {
        "goofish"
    }

    fn capabilities(&self) -> &[PluginCapability] {
        GOOFISH_CAPABILITIES
    }

    fn create_account_runtime(
        &self,
        ctx: AccountRuntimeContext,
        host: Arc<dyn PluginHostPorts>,
    ) -> Result<Box<dyn AccountRuntime>, PluginError> {
        if ctx.plugin_code != "goofish" {
            return Err(PluginError::PluginNotFound(ctx.plugin_code));
        }
        Ok(Box::new(GoofishAccountRuntime::new(ctx, host, None)))
    }
}

/// Factory registered via `sdkwork.plugin.manifest.json` → `entrypoints.registryFactory`.
pub fn register() -> Box<dyn ChannelPlugin> {
    Box::new(GoofishChannelPlugin)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_communication_customerservice_plugin_spi::{ConnectionState, PluginHostPorts};
    use uuid::Uuid;

    struct NoopHost;

    #[async_trait::async_trait]
    impl PluginHostPorts for NoopHost {
        async fn persist_inbound_message(
            &self,
            _ctx: &AccountRuntimeContext,
            _msg: sdkwork_communication_customerservice_plugin_spi::NormalizedChannelMessage,
        ) -> Result<uuid::Uuid, PluginError> {
            Ok(uuid::Uuid::new_v4())
        }

        async fn bridge_to_ticket(
            &self,
            _conversation_id: uuid::Uuid,
        ) -> Result<uuid::Uuid, PluginError> {
            Ok(uuid::Uuid::new_v4())
        }
    }

    #[test]
    fn register_exposes_goofish_code() {
        let plugin = register();
        assert_eq!(plugin.plugin_code(), "goofish");
        assert!(!plugin.capabilities().is_empty());
    }

    #[test]
    fn creates_account_runtime_for_matching_context() {
        let plugin = register();
        let host: Arc<dyn PluginHostPorts> = Arc::new(NoopHost);
        let runtime = plugin
            .create_account_runtime(
                AccountRuntimeContext {
                    tenant_id: Uuid::new_v4(),
                    account_id: Uuid::new_v4(),
                    plugin_code: "goofish".to_owned(),
                },
                host,
            )
            .expect("runtime");
        assert_eq!(runtime.connection_state(), ConnectionState::Disconnected);
    }
}
