use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TicketSummary {
    pub id: Uuid,
    pub ticket_no: String,
    pub subject: String,
    pub status: String,
    pub priority: String,
    pub channel: String,
    pub requester_user_id: Uuid,
    pub assignee_user_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TicketDetail {
    #[serde(flatten)]
    pub summary: TicketSummary,
    pub organization_id: Option<Uuid>,
    pub closed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TicketMessage {
    pub id: Uuid,
    pub ticket_id: Uuid,
    pub author_user_id: Uuid,
    pub author_role: String,
    pub body: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TicketAttachment {
    pub id: Uuid,
    pub ticket_id: Uuid,
    pub drive_node_id: Uuid,
    pub file_name: String,
    pub content_type: Option<String>,
    pub size_bytes: Option<i64>,
    pub uploaded_by_user_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CreateTicketCommand {
    pub tenant_id: Uuid,
    pub organization_id: Option<Uuid>,
    pub requester_user_id: Uuid,
    pub subject: String,
    pub body: String,
    pub priority: Option<String>,
    pub channel: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SendMessageCommand {
    pub tenant_id: Uuid,
    pub ticket_id: Uuid,
    pub author_user_id: Uuid,
    pub author_role: String,
    pub body: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UpdateTicketCommand {
    pub tenant_id: Uuid,
    pub ticket_id: Uuid,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assignee_user_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RegisterAttachmentCommand {
    pub tenant_id: Uuid,
    pub ticket_id: Uuid,
    pub drive_node_id: Uuid,
    pub file_name: String,
    pub content_type: Option<String>,
    pub size_bytes: Option<i64>,
    pub uploaded_by_user_id: Uuid,
}
