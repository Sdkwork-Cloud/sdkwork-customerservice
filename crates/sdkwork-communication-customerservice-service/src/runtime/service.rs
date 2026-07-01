use crate::credential_crypto::{encrypt_credential_payload, CREDENTIAL_KEY_VERSION_AES256GCM};
use sdkwork_utils_rust::random_string;
use uuid::Uuid;

use super::channel_domain::{
    AutoReplyRuleSummary, ChannelAccountSummary, CreateAutoReplyRuleCommand,
    CreateChannelAccountCommand, DeliveryBlockRuleSummary, PluginCatalogEntry,
    PluginEnablementSummary, UpdateAutoReplyRuleCommand, UpdateChannelAccountCommand,
    UpsertChannelCredentialCommand, UpsertDeliveryBlockRuleItem, UpsertPluginEnablementCommand,
};
use super::channel_ports::ChannelPluginRepository;
use super::domain::{
    CreateTicketCommand, RegisterAttachmentCommand, SendMessageCommand, TicketAttachment,
    TicketDetail, TicketMessage, TicketSummary, UpdateTicketCommand,
};
use super::ports::CustomerServiceRepository;
use crate::validation::{
    normalize_priority, normalize_ticket_status, require_non_blank, require_uuid,
};
use crate::CustomerServiceError;

pub struct CustomerServiceService<R: CustomerServiceRepository> {
    repository: R,
}

impl<R: CustomerServiceRepository> CustomerServiceService<R> {
    pub fn new(repository: R) -> Self {
        Self { repository }
    }

    pub async fn create_ticket(
        &self,
        command: CreateTicketCommand,
    ) -> Result<TicketDetail, CustomerServiceError> {
        let subject = require_non_blank(&command.subject, "subject")?;
        let body = require_non_blank(&command.body, "body")?.to_owned();
        let priority = normalize_priority(command.priority.as_deref().unwrap_or("normal"))?;
        let channel = require_non_blank(command.channel.as_deref().unwrap_or("web"), "channel")?;
        let ticket_no = format!("CS-{}", random_string(10).to_ascii_uppercase());

        let tenant_id = command.tenant_id;
        let requester_user_id = command.requester_user_id;
        let mut normalized = command;
        normalized.subject = subject;
        normalized.body = body.clone();
        normalized.priority = Some(priority);
        normalized.channel = Some(channel);

        let detail = self
            .repository
            .create_ticket(normalized.clone(), ticket_no)
            .await?;

        let _ = self
            .repository
            .append_message(SendMessageCommand {
                tenant_id,
                ticket_id: detail.summary.id,
                author_user_id: requester_user_id,
                author_role: "customer".to_owned(),
                body,
            })
            .await?;

        Ok(detail)
    }

    pub async fn list_my_tickets(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        status: Option<&str>,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<TicketSummary>, u64), CustomerServiceError> {
        let page_size = page_size.clamp(1, 100);
        let offset = page.saturating_mul(page_size);
        if let Some(raw_status) = status {
            let _ = normalize_ticket_status(raw_status)?;
        }
        self.repository
            .list_tickets_for_requester(tenant_id, requester_user_id, status, page_size, offset)
            .await
    }

    pub async fn list_admin_tickets(
        &self,
        tenant_id: Uuid,
        status: Option<&str>,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<TicketSummary>, u64), CustomerServiceError> {
        let page_size = page_size.clamp(1, 100);
        let offset = page.saturating_mul(page_size);
        if let Some(raw_status) = status {
            let _ = normalize_ticket_status(raw_status)?;
        }
        self.repository
            .list_tickets_for_admin(tenant_id, status, page_size, offset)
            .await
    }

    pub async fn retrieve_ticket(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<TicketDetail, CustomerServiceError> {
        self.repository
            .retrieve_ticket(tenant_id, ticket_id)
            .await?
            .ok_or_else(|| CustomerServiceError::NotFound("ticket not found".to_owned()))
    }

    /// App-api scoped ticket read: hides existence when the caller is not the requester.
    pub async fn retrieve_ticket_for_requester(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<TicketDetail, CustomerServiceError> {
        let ticket = self.retrieve_ticket(tenant_id, ticket_id).await?;
        if ticket.summary.requester_user_id != requester_user_id {
            return Err(CustomerServiceError::NotFound(
                "ticket not found".to_owned(),
            ));
        }
        Ok(ticket)
    }

    pub async fn update_ticket(
        &self,
        command: UpdateTicketCommand,
    ) -> Result<TicketDetail, CustomerServiceError> {
        let mut normalized = command;
        if let Some(status) = normalized.status.as_deref() {
            normalized.status = Some(normalize_ticket_status(status)?);
        }
        if let Some(priority) = normalized.priority.as_deref() {
            normalized.priority = Some(normalize_priority(priority)?);
        }
        self.repository.update_ticket(normalized).await
    }

    pub async fn send_message(
        &self,
        command: SendMessageCommand,
        allow_agent: bool,
    ) -> Result<TicketMessage, CustomerServiceError> {
        let body = require_non_blank(&command.body, "body")?;
        let role = require_non_blank(&command.author_role, "authorRole")?.to_ascii_lowercase();
        if role != "customer" && role != "agent" {
            return Err(CustomerServiceError::Validation(
                "authorRole must be customer or agent".to_owned(),
            ));
        }
        if role == "agent" && !allow_agent {
            return Err(CustomerServiceError::Forbidden(
                "agent messages require backend authorization".to_owned(),
            ));
        }

        let ticket = self
            .retrieve_ticket(command.tenant_id, command.ticket_id)
            .await?;
        if role == "customer" && ticket.summary.requester_user_id != command.author_user_id {
            return Err(CustomerServiceError::NotFound(
                "ticket not found".to_owned(),
            ));
        }
        if ticket.summary.status == "closed" {
            return Err(CustomerServiceError::Validation(
                "closed tickets cannot receive new messages".to_owned(),
            ));
        }

        self.repository
            .append_message(SendMessageCommand {
                body,
                author_role: role,
                ..command
            })
            .await
    }

    pub async fn list_messages(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<TicketMessage>, u64), CustomerServiceError> {
        let _ = self.retrieve_ticket(tenant_id, ticket_id).await?;
        let page_size = page_size.clamp(1, 200);
        let offset = page.saturating_mul(page_size);
        self.repository
            .list_messages(tenant_id, ticket_id, page_size, offset)
            .await
    }

    pub async fn list_messages_for_requester(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        ticket_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<TicketMessage>, u64), CustomerServiceError> {
        let _ = self
            .retrieve_ticket_for_requester(tenant_id, requester_user_id, ticket_id)
            .await?;
        self.list_messages(tenant_id, ticket_id, page, page_size)
            .await
    }

    pub async fn register_drive_attachment(
        &self,
        command: RegisterAttachmentCommand,
    ) -> Result<TicketAttachment, CustomerServiceError> {
        let file_name = require_non_blank(&command.file_name, "fileName")?;
        require_uuid(&command.drive_node_id.to_string(), "driveNodeId")?;
        let _ = self
            .retrieve_ticket(command.tenant_id, command.ticket_id)
            .await?;

        self.repository
            .register_attachment(RegisterAttachmentCommand {
                file_name,
                ..command
            })
            .await
    }

    pub async fn register_drive_attachment_for_requester(
        &self,
        requester_user_id: Uuid,
        command: RegisterAttachmentCommand,
    ) -> Result<TicketAttachment, CustomerServiceError> {
        let _ = self
            .retrieve_ticket_for_requester(command.tenant_id, requester_user_id, command.ticket_id)
            .await?;
        self.register_drive_attachment(command).await
    }

    pub async fn list_attachments(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Vec<TicketAttachment>, CustomerServiceError> {
        let _ = self.retrieve_ticket(tenant_id, ticket_id).await?;
        self.repository.list_attachments(tenant_id, ticket_id).await
    }

    pub async fn list_attachments_for_requester(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Vec<TicketAttachment>, CustomerServiceError> {
        let _ = self
            .retrieve_ticket_for_requester(tenant_id, requester_user_id, ticket_id)
            .await?;
        self.list_attachments(tenant_id, ticket_id).await
    }

    pub async fn list_plugin_catalog(&self) -> Result<Vec<PluginCatalogEntry>, CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        self.repository.list_plugin_catalog().await
    }

    pub async fn list_plugin_catalog_for_tenant(
        &self,
        tenant_id: Uuid,
    ) -> Result<Vec<PluginCatalogEntry>, CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        let mut items = self.repository.list_plugin_catalog().await?;
        let enablements = self
            .repository
            .list_plugin_enablement_for_tenant(tenant_id)
            .await?;
        let enabled_by_code: std::collections::HashMap<String, bool> = enablements
            .into_iter()
            .map(|entry| (entry.plugin_code, entry.enabled))
            .collect();
        for item in &mut items {
            item.tenant_enabled = Some(
                enabled_by_code
                    .get(&item.plugin_code)
                    .copied()
                    .unwrap_or(true),
            );
        }
        Ok(items)
    }

    pub async fn upsert_plugin_enablement(
        &self,
        command: UpsertPluginEnablementCommand,
    ) -> Result<PluginEnablementSummary, CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        let plugin_code = require_non_blank(&command.plugin_code, "pluginCode")?;
        let catalog = self.repository.list_plugin_catalog().await?;
        if !catalog.iter().any(|entry| entry.plugin_code == plugin_code) {
            return Err(CustomerServiceError::NotFound(
                "plugin not found in catalog".to_owned(),
            ));
        }
        self.repository
            .upsert_plugin_enablement(UpsertPluginEnablementCommand {
                plugin_code,
                ..command
            })
            .await
    }

    pub async fn list_channel_accounts(
        &self,
        tenant_id: Uuid,
        plugin_code: Option<&str>,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<ChannelAccountSummary>, u64), CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        let page_size = page_size.clamp(1, 100);
        let offset = page.saturating_mul(page_size);
        self.repository
            .list_channel_accounts(tenant_id, plugin_code, page_size, offset)
            .await
    }

    pub async fn create_channel_account(
        &self,
        command: CreateChannelAccountCommand,
    ) -> Result<ChannelAccountSummary, CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        let plugin_code = require_non_blank(&command.plugin_code, "pluginCode")?;
        let display_name = require_non_blank(&command.display_name, "displayName")?;
        self.repository
            .create_channel_account(CreateChannelAccountCommand {
                plugin_code,
                display_name,
                ..command
            })
            .await
    }

    pub async fn upsert_channel_credential(
        &self,
        command: UpsertChannelCredentialCommand,
    ) -> Result<(), CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        let credential_kind = require_non_blank(&command.credential_kind, "credentialKind")?;
        if command.payload.is_empty() {
            return Err(CustomerServiceError::Validation(
                "credential payload must not be empty".to_owned(),
            ));
        }
        self.require_channel_account_for_tenant(command.tenant_id, command.account_id)
            .await?;
        let encrypted = encrypt_credential_payload(&command.payload)?;
        self.repository
            .upsert_channel_credential(UpsertChannelCredentialCommand {
                credential_kind,
                payload: encrypted,
                key_version: CREDENTIAL_KEY_VERSION_AES256GCM.to_owned(),
                ..command
            })
            .await
    }

    pub async fn require_channel_account_for_tenant(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
    ) -> Result<ChannelAccountSummary, CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        self.repository
            .get_channel_account_by_id(account_id)
            .await?
            .filter(|account| account.tenant_id == tenant_id)
            .ok_or_else(|| CustomerServiceError::NotFound("channel account not found".to_owned()))
    }

    pub async fn get_channel_account_by_id(
        &self,
        account_id: Uuid,
    ) -> Result<Option<ChannelAccountSummary>, CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        self.repository.get_channel_account_by_id(account_id).await
    }

    pub async fn list_auto_reply_rules(
        &self,
        tenant_id: Uuid,
        plugin_code: Option<&str>,
        account_id: Option<Uuid>,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<AutoReplyRuleSummary>, u64), CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        let page_size = page_size.clamp(1, 100);
        let offset = page.saturating_mul(page_size);
        self.repository
            .list_auto_reply_rules(tenant_id, plugin_code, account_id, page_size, offset)
            .await
    }

    pub async fn create_auto_reply_rule(
        &self,
        command: CreateAutoReplyRuleCommand,
    ) -> Result<AutoReplyRuleSummary, CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        let plugin_code = require_non_blank(&command.plugin_code, "pluginCode")?;
        let rule_kind = require_non_blank(&command.rule_kind, "ruleKind")?;
        let reply_content = require_non_blank(&command.reply_content, "replyContent")?;
        if let Some(account_id) = command.account_id {
            self.require_channel_account_for_tenant(command.tenant_id, account_id)
                .await?;
        }
        self.repository
            .create_auto_reply_rule(CreateAutoReplyRuleCommand {
                plugin_code,
                rule_kind,
                reply_content,
                ..command
            })
            .await
    }

    pub async fn update_channel_account(
        &self,
        command: UpdateChannelAccountCommand,
    ) -> Result<ChannelAccountSummary, CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        if command.display_name.is_none() && command.enabled.is_none() && command.status.is_none() {
            return Err(CustomerServiceError::Validation(
                "at least one field must be provided".to_owned(),
            ));
        }
        if let Some(display_name) = command.display_name.as_deref() {
            require_non_blank(display_name, "displayName")?;
        }
        if let Some(status) = command.status.as_deref() {
            require_non_blank(status, "status")?;
        }
        self.require_channel_account_for_tenant(command.tenant_id, command.account_id)
            .await?;
        self.repository.update_channel_account(command).await
    }

    pub async fn update_auto_reply_rule(
        &self,
        command: UpdateAutoReplyRuleCommand,
    ) -> Result<AutoReplyRuleSummary, CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        if command.priority.is_none()
            && command.enabled.is_none()
            && command.match_pattern.is_none()
            && command.reply_content.is_none()
        {
            return Err(CustomerServiceError::Validation(
                "at least one field must be provided".to_owned(),
            ));
        }
        if let Some(reply_content) = command.reply_content.as_deref() {
            require_non_blank(reply_content, "replyContent")?;
        }
        self.repository.update_auto_reply_rule(command).await
    }

    pub async fn delete_auto_reply_rule(
        &self,
        tenant_id: Uuid,
        rule_id: Uuid,
    ) -> Result<(), CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        self.repository
            .delete_auto_reply_rule(tenant_id, rule_id)
            .await
    }

    pub async fn list_delivery_block_rules_for_account(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
    ) -> Result<Vec<DeliveryBlockRuleSummary>, CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        self.require_channel_account_for_tenant(tenant_id, account_id)
            .await?;
        self.repository
            .list_delivery_block_rules_for_account(tenant_id, account_id)
            .await
    }

    pub async fn upsert_delivery_block_rules(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        plugin_code: &str,
        items: Vec<UpsertDeliveryBlockRuleItem>,
    ) -> Result<Vec<DeliveryBlockRuleSummary>, CustomerServiceError>
    where
        R: ChannelPluginRepository,
    {
        if items.is_empty() {
            return Err(CustomerServiceError::Validation(
                "rules must not be empty".to_owned(),
            ));
        }
        let account = self
            .require_channel_account_for_tenant(tenant_id, account_id)
            .await?;
        if account.plugin_code != plugin_code {
            return Err(CustomerServiceError::Validation(
                "pluginCode does not match channel account".to_owned(),
            ));
        }
        for item in &items {
            require_non_blank(&item.rule_code, "ruleCode")?;
        }
        self.repository
            .upsert_delivery_block_rules(tenant_id, account_id, plugin_code, items)
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::MemoryTicketRepository;

    #[tokio::test]
    async fn rejects_blank_subject() {
        let service = CustomerServiceService::new(MemoryTicketRepository::new());
        let result = service
            .create_ticket(CreateTicketCommand {
                tenant_id: Uuid::new_v4(),
                organization_id: None,
                requester_user_id: Uuid::new_v4(),
                subject: "   ".to_owned(),
                body: "help".to_owned(),
                priority: None,
                channel: None,
            })
            .await;
        assert!(matches!(result, Err(CustomerServiceError::Validation(_))));
    }

    #[tokio::test]
    async fn hides_ticket_from_other_requester() {
        let tenant_id = Uuid::new_v4();
        let owner_id = Uuid::new_v4();
        let other_id = Uuid::new_v4();
        let service = CustomerServiceService::new(MemoryTicketRepository::new());
        let created = service
            .create_ticket(CreateTicketCommand {
                tenant_id,
                organization_id: None,
                requester_user_id: owner_id,
                subject: "help".to_owned(),
                body: "please assist".to_owned(),
                priority: None,
                channel: None,
            })
            .await
            .expect("create ticket");
        let result = service
            .retrieve_ticket_for_requester(tenant_id, other_id, created.summary.id)
            .await;
        assert!(matches!(result, Err(CustomerServiceError::NotFound(_))));
    }
}
