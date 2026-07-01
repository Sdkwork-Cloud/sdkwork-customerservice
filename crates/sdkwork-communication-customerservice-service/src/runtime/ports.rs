use async_trait::async_trait;
use uuid::Uuid;

use super::domain::{
    CreateTicketCommand, RegisterAttachmentCommand, SendMessageCommand, TicketAttachment,
    TicketDetail, TicketMessage, TicketSummary, UpdateTicketCommand,
};
use crate::CustomerServiceError;

#[async_trait]
pub trait CustomerServiceRepository: Send + Sync {
    async fn create_ticket(
        &self,
        command: CreateTicketCommand,
        ticket_no: String,
    ) -> Result<TicketDetail, CustomerServiceError>;

    async fn list_tickets_for_requester(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        status: Option<&str>,
        limit: u32,
        offset: u32,
    ) -> Result<(Vec<TicketSummary>, u64), CustomerServiceError>;

    async fn list_tickets_for_admin(
        &self,
        tenant_id: Uuid,
        status: Option<&str>,
        limit: u32,
        offset: u32,
    ) -> Result<(Vec<TicketSummary>, u64), CustomerServiceError>;

    async fn retrieve_ticket(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Option<TicketDetail>, CustomerServiceError>;

    async fn update_ticket(
        &self,
        command: UpdateTicketCommand,
    ) -> Result<TicketDetail, CustomerServiceError>;

    async fn append_message(
        &self,
        command: SendMessageCommand,
    ) -> Result<TicketMessage, CustomerServiceError>;

    async fn list_messages(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
        limit: u32,
        offset: u32,
    ) -> Result<(Vec<TicketMessage>, u64), CustomerServiceError>;

    async fn register_attachment(
        &self,
        command: RegisterAttachmentCommand,
    ) -> Result<TicketAttachment, CustomerServiceError>;

    async fn list_attachments(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Vec<TicketAttachment>, CustomerServiceError>;
}
