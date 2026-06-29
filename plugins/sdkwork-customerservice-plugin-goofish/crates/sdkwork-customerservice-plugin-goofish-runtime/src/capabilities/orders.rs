/// Order sync and overlay persistence (reference: `order_service.py`, `xy_orders`).
pub struct GoofishOrderSync;

impl GoofishOrderSync {
    pub fn new() -> Self {
        Self
    }

    pub fn overlay_table(&self) -> &'static str {
        "communication_cs_plugin_goofish_order"
    }
}

impl Default for GoofishOrderSync {
    fn default() -> Self {
        Self::new()
    }
}
