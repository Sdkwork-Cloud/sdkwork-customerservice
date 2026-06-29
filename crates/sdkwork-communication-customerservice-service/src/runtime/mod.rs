pub mod channel_domain;
pub mod channel_ports;
pub mod domain;
pub mod ports;
pub mod service;

pub use channel_domain::{
    goofish_delivery_block_rule_catalog, goofish_order_status_rank, AutoReplyRuleSummary,
    ChannelAccountSummary, ConversationBridgeContext, CreateAutoReplyRuleCommand,
    CreateChannelAccountCommand, DeliveryBlockRuleCatalogEntry, DeliveryBlockRuleSummary,
    PersistChannelMessageCommand, PluginCatalogEntry, PluginEnablementSummary,
    UpdateAutoReplyRuleCommand, UpdateChannelAccountCommand, UpsertChannelCredentialCommand,
    UpsertDeliveryBlockRuleItem, UpsertGoofishOrderOverlayCommand, UpsertPluginEnablementCommand,
};
pub use channel_ports::ChannelPluginRepository;
pub use domain::{
    CreateTicketCommand, RegisterAttachmentCommand, SendMessageCommand, TicketAttachment,
    TicketDetail, TicketMessage, TicketSummary, UpdateTicketCommand,
};
pub use ports::CustomerServiceRepository;
pub use service::CustomerServiceService;

pub fn delivery_block_rule_catalog(plugin_code: &str) -> Vec<DeliveryBlockRuleCatalogEntry> {
    match plugin_code {
        "goofish" => goofish_delivery_block_rule_catalog(),
        _ => Vec::new(),
    }
}
