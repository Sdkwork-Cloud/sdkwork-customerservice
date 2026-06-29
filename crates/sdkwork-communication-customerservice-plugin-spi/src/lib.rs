//! Channel plugin SPI for marketplace customer service integrations.
//!
//! Spec: `specs/PLUGIN_SYSTEM_SPEC.md`

mod error;
mod model;
mod ports;
mod traits;

pub use error::PluginError;
pub use model::*;
pub use ports::PluginHostPorts;
pub use traits::{DeliveryRule, DeliveryRuleEvaluationPorts, DeliveryRuleRegistry, *};
