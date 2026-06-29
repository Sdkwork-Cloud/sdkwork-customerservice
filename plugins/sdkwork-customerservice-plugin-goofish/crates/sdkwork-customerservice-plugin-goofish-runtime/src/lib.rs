//! Goofish (闲鱼) channel plugin runtime.
//!
//! Capability modules mirror `external/xianyu-auto-reply/websocket/app/services/xianyu/`
//! but execute as an SDKWork plugin worker behind SPI traits.

pub mod account_runtime;
pub mod capabilities;
pub mod plugin;

pub use account_runtime::create_prepared_goofish_runtime;
pub use capabilities::delivery_rules::GoofishDeliveryRuleRegistry;
pub use plugin::{register, GoofishChannelPlugin};
