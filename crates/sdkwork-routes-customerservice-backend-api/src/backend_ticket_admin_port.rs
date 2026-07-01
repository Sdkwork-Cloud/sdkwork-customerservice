use std::sync::Arc;

use async_trait::async_trait;
use sdkwork_communication_customerservice_service::{
    CustomerServiceError, CustomerServiceRepository, CustomerServiceService, SendMessageCommand,
    TicketDetail, TicketMessage, TicketSummary, UpdateTicketCommand,
};
use uuid::Uuid;

/// HTTP backend-api ticket admin surface (object-safe for Axum state).
#[async_trait]
pub trait BackendTicketAdminPort: Send + Sync {
    async fn list_admin_tickets(
        &self,
        tenant_id: Uuid,
        status: Option<&str>,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<TicketSummary>, u64), CustomerServiceError>;

    async fn retrieve_ticket(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<TicketDetail, CustomerServiceError>;

    async fn update_ticket(
        &self,
        command: UpdateTicketCommand,
    ) -> Result<TicketDetail, CustomerServiceError>;

    async fn list_messages(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<TicketMessage>, u64), CustomerServiceError>;

    async fn send_message(
        &self,
        command: SendMessageCommand,
        allow_agent: bool,
    ) -> Result<TicketMessage, CustomerServiceError>;
}

#[async_trait]
impl<R> BackendTicketAdminPort for CustomerServiceService<R>
where
    R: CustomerServiceRepository + Send + Sync,
{
    async fn list_admin_tickets(
        &self,
        tenant_id: Uuid,
        status: Option<&str>,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<TicketSummary>, u64), CustomerServiceError> {
        CustomerServiceService::list_admin_tickets(self, tenant_id, status, page, page_size).await
    }

    async fn retrieve_ticket(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<TicketDetail, CustomerServiceError> {
        CustomerServiceService::retrieve_ticket(self, tenant_id, ticket_id).await
    }

    async fn update_ticket(
        &self,
        command: UpdateTicketCommand,
    ) -> Result<TicketDetail, CustomerServiceError> {
        CustomerServiceService::update_ticket(self, command).await
    }

    async fn list_messages(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<TicketMessage>, u64), CustomerServiceError> {
        CustomerServiceService::list_messages(self, tenant_id, ticket_id, page, page_size).await
    }

    async fn send_message(
        &self,
        command: SendMessageCommand,
        allow_agent: bool,
    ) -> Result<TicketMessage, CustomerServiceError> {
        CustomerServiceService::send_message(self, command, allow_agent).await
    }
}

pub fn backend_ticket_admin_port<R>(
    service: Arc<CustomerServiceService<R>>,
) -> Arc<dyn BackendTicketAdminPort>
where
    R: CustomerServiceRepository + Send + Sync + 'static,
{
    service
}
