use std::sync::Mutex;

use async_trait::async_trait;
use chrono::Utc;
use uuid::Uuid;

use crate::runtime::domain::TicketSummary;
use crate::{
    CreateTicketCommand, CustomerServiceError, CustomerServiceRepository,
    RegisterAttachmentCommand, SendMessageCommand, TicketAttachment, TicketDetail, TicketMessage,
    UpdateTicketCommand,
};

/// In-memory ticket repository for route and service integration tests.
#[derive(Default)]
pub struct MemoryTicketRepository {
    tickets: Mutex<Vec<TicketDetail>>,
    messages: Mutex<Vec<TicketMessage>>,
    attachments: Mutex<Vec<TicketAttachment>>,
}

impl MemoryTicketRepository {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl CustomerServiceRepository for MemoryTicketRepository {
    async fn create_ticket(
        &self,
        command: CreateTicketCommand,
        ticket_no: String,
    ) -> Result<TicketDetail, CustomerServiceError> {
        let now = Utc::now();
        let summary = TicketSummary {
            id: Uuid::new_v4(),
            ticket_no,
            subject: command.subject,
            status: "open".to_owned(),
            priority: command.priority.unwrap_or_else(|| "normal".to_owned()),
            channel: command.channel.unwrap_or_else(|| "web".to_owned()),
            requester_user_id: command.requester_user_id,
            assignee_user_id: None,
            created_at: now,
            updated_at: now,
        };
        let detail = TicketDetail {
            summary,
            organization_id: command.organization_id,
            closed_at: None,
        };
        self.tickets.lock().unwrap().push(detail.clone());
        Ok(detail)
    }

    async fn list_tickets_for_requester(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        status: Option<&str>,
        limit: u32,
        offset: u32,
    ) -> Result<(Vec<TicketSummary>, u64), CustomerServiceError> {
        let all: Vec<TicketSummary> = self
            .tickets
            .lock()
            .unwrap()
            .iter()
            .filter(|ticket| {
                ticket.organization_id.is_none()
                    && ticket.summary.requester_user_id == requester_user_id
            })
            .map(|ticket| ticket.summary.clone())
            .filter(|summary| status.map(|value| summary.status == value).unwrap_or(true))
            .collect();
        let total = all.len() as u64;
        let items = all
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();
        let _ = tenant_id;
        Ok((items, total))
    }

    async fn list_tickets_for_admin(
        &self,
        _tenant_id: Uuid,
        status: Option<&str>,
        limit: u32,
        offset: u32,
    ) -> Result<(Vec<TicketSummary>, u64), CustomerServiceError> {
        let all: Vec<TicketSummary> = self
            .tickets
            .lock()
            .unwrap()
            .iter()
            .map(|ticket| ticket.summary.clone())
            .filter(|summary| status.map(|value| summary.status == value).unwrap_or(true))
            .collect();
        let total = all.len() as u64;
        let items = all
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();
        Ok((items, total))
    }

    async fn retrieve_ticket(
        &self,
        _tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Option<TicketDetail>, CustomerServiceError> {
        Ok(self
            .tickets
            .lock()
            .unwrap()
            .iter()
            .find(|ticket| ticket.summary.id == ticket_id)
            .cloned())
    }

    async fn update_ticket(
        &self,
        command: UpdateTicketCommand,
    ) -> Result<TicketDetail, CustomerServiceError> {
        let mut tickets = self.tickets.lock().unwrap();
        let ticket = tickets
            .iter_mut()
            .find(|ticket| ticket.summary.id == command.ticket_id)
            .ok_or_else(|| CustomerServiceError::NotFound("ticket not found".to_owned()))?;
        if let Some(status) = command.status {
            ticket.summary.status = status;
        }
        if let Some(priority) = command.priority {
            ticket.summary.priority = priority;
        }
        if let Some(assignee) = command.assignee_user_id {
            ticket.summary.assignee_user_id = Some(assignee);
        }
        ticket.summary.updated_at = Utc::now();
        Ok(ticket.clone())
    }

    async fn append_message(
        &self,
        command: SendMessageCommand,
    ) -> Result<TicketMessage, CustomerServiceError> {
        let message = TicketMessage {
            id: Uuid::new_v4(),
            ticket_id: command.ticket_id,
            author_user_id: command.author_user_id,
            author_role: command.author_role,
            body: command.body,
            created_at: Utc::now(),
        };
        self.messages.lock().unwrap().push(message.clone());
        Ok(message)
    }

    async fn list_messages(
        &self,
        _tenant_id: Uuid,
        ticket_id: Uuid,
        limit: u32,
        offset: u32,
    ) -> Result<(Vec<TicketMessage>, u64), CustomerServiceError> {
        let all: Vec<TicketMessage> = self
            .messages
            .lock()
            .unwrap()
            .iter()
            .filter(|message| message.ticket_id == ticket_id)
            .cloned()
            .collect();
        let total = all.len() as u64;
        let items = all
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();
        Ok((items, total))
    }

    async fn register_attachment(
        &self,
        command: RegisterAttachmentCommand,
    ) -> Result<TicketAttachment, CustomerServiceError> {
        let attachment = TicketAttachment {
            id: Uuid::new_v4(),
            ticket_id: command.ticket_id,
            drive_node_id: command.drive_node_id,
            file_name: command.file_name,
            content_type: command.content_type,
            size_bytes: command.size_bytes,
            uploaded_by_user_id: command.uploaded_by_user_id,
            created_at: Utc::now(),
        };
        self.attachments.lock().unwrap().push(attachment.clone());
        Ok(attachment)
    }

    async fn list_attachments(
        &self,
        _tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Vec<TicketAttachment>, CustomerServiceError> {
        Ok(self
            .attachments
            .lock()
            .unwrap()
            .iter()
            .filter(|attachment| attachment.ticket_id == ticket_id)
            .cloned()
            .collect())
    }
}
