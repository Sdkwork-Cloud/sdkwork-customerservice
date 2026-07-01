use std::sync::Arc;

use async_trait::async_trait;
use sdkwork_communication_customerservice_service::{
    CreateTicketCommand, CustomerServiceError, CustomerServiceRepository, CustomerServiceService,
    RegisterAttachmentCommand, SendMessageCommand, TicketAttachment, TicketDetail, TicketMessage,
    TicketSummary,
};
use uuid::Uuid;

/// HTTP app-api ticket surface used by route handlers (object-safe for Axum state).
#[async_trait]
pub trait TicketApiPort: Send + Sync {
    async fn list_my_tickets(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        status: Option<&str>,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<TicketSummary>, u64), CustomerServiceError>;

    async fn create_ticket(
        &self,
        command: CreateTicketCommand,
    ) -> Result<TicketDetail, CustomerServiceError>;

    async fn retrieve_ticket_for_requester(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<TicketDetail, CustomerServiceError>;

    async fn list_messages_for_requester(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        ticket_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<TicketMessage>, u64), CustomerServiceError>;

    async fn send_message(
        &self,
        command: SendMessageCommand,
        allow_agent: bool,
    ) -> Result<TicketMessage, CustomerServiceError>;

    async fn register_drive_attachment_for_requester(
        &self,
        requester_user_id: Uuid,
        command: RegisterAttachmentCommand,
    ) -> Result<TicketAttachment, CustomerServiceError>;

    async fn list_attachments_for_requester(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Vec<TicketAttachment>, CustomerServiceError>;
}

#[async_trait]
impl<R> TicketApiPort for CustomerServiceService<R>
where
    R: CustomerServiceRepository + Send + Sync,
{
    async fn list_my_tickets(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        status: Option<&str>,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<TicketSummary>, u64), CustomerServiceError> {
        CustomerServiceService::list_my_tickets(
            self,
            tenant_id,
            requester_user_id,
            status,
            page,
            page_size,
        )
        .await
    }

    async fn create_ticket(
        &self,
        command: CreateTicketCommand,
    ) -> Result<TicketDetail, CustomerServiceError> {
        CustomerServiceService::create_ticket(self, command).await
    }

    async fn retrieve_ticket_for_requester(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<TicketDetail, CustomerServiceError> {
        CustomerServiceService::retrieve_ticket_for_requester(
            self,
            tenant_id,
            requester_user_id,
            ticket_id,
        )
        .await
    }

    async fn list_messages_for_requester(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        ticket_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<TicketMessage>, u64), CustomerServiceError> {
        CustomerServiceService::list_messages_for_requester(
            self,
            tenant_id,
            requester_user_id,
            ticket_id,
            page,
            page_size,
        )
        .await
    }

    async fn send_message(
        &self,
        command: SendMessageCommand,
        allow_agent: bool,
    ) -> Result<TicketMessage, CustomerServiceError> {
        CustomerServiceService::send_message(self, command, allow_agent).await
    }

    async fn register_drive_attachment_for_requester(
        &self,
        requester_user_id: Uuid,
        command: RegisterAttachmentCommand,
    ) -> Result<TicketAttachment, CustomerServiceError> {
        CustomerServiceService::register_drive_attachment_for_requester(
            self,
            requester_user_id,
            command,
        )
        .await
    }

    async fn list_attachments_for_requester(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Vec<TicketAttachment>, CustomerServiceError> {
        CustomerServiceService::list_attachments_for_requester(
            self,
            tenant_id,
            requester_user_id,
            ticket_id,
        )
        .await
    }
}

pub fn ticket_api_port<R>(service: Arc<CustomerServiceService<R>>) -> Arc<dyn TicketApiPort>
where
    R: CustomerServiceRepository + Send + Sync + 'static,
{
    service
}
