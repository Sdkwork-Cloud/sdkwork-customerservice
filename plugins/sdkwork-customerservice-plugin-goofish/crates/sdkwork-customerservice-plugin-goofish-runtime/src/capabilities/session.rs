use std::sync::Arc;

use sdkwork_communication_customerservice_plugin_spi::PluginHostPorts;

/// Cookie/token session maintenance (reference: `CookieManager`, `TokenManager`).
pub struct GoofishSessionProvider {
    #[allow(dead_code)]
    host: Arc<dyn PluginHostPorts>,
}

impl GoofishSessionProvider {
    pub fn new(host: Arc<dyn PluginHostPorts>) -> Self {
        Self { host }
    }

    pub fn plugin_code(&self) -> &'static str {
        "goofish"
    }
}
