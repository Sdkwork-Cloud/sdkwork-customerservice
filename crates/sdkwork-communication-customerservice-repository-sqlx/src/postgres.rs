use async_trait::async_trait;
use chrono::Utc;
use sdkwork_communication_customerservice_service::{
    CreateTicketCommand, CustomerServiceError, CustomerServiceRepository,
    RegisterAttachmentCommand, SendMessageCommand, TicketAttachment, TicketDetail, TicketMessage,
    TicketSummary, UpdateTicketCommand,
};
use sdkwork_database_sqlx::DatabasePool;
use sqlx::{PgPool, Row};
use uuid::Uuid;

pub struct SqlxCustomerServiceRepository {
    pool: PgPool,
}

impl SqlxCustomerServiceRepository {
    pub fn new(pool: DatabasePool) -> Self {
        Self {
            pool: pool
                .as_postgres()
                .cloned()
                .expect("customerservice repository requires postgres DatabasePool"),
        }
    }

    pub(crate) fn pg_pool(&self) -> &PgPool {
        &self.pool
    }
}

#[async_trait]
impl CustomerServiceRepository for SqlxCustomerServiceRepository {
    async fn create_ticket(
        &self,
        command: CreateTicketCommand,
        ticket_no: String,
    ) -> Result<TicketDetail, CustomerServiceError> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let priority = command.priority.unwrap_or_else(|| "normal".to_owned());
        let channel = command.channel.unwrap_or_else(|| "web".to_owned());

        sqlx::query(
            r#"
            INSERT INTO communication_cs_ticket (
              id, tenant_id, organization_id, ticket_no, subject, status, priority, channel,
              requester_user_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8, $9, $9)
            "#,
        )
        .bind(id)
        .bind(command.tenant_id)
        .bind(command.organization_id)
        .bind(&ticket_no)
        .bind(&command.subject)
        .bind(&priority)
        .bind(&channel)
        .bind(command.requester_user_id)
        .bind(now)
        .execute(&self.pool)
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(TicketDetail {
            summary: TicketSummary {
                id,
                ticket_no,
                subject: command.subject,
                status: "open".to_owned(),
                priority,
                channel,
                requester_user_id: command.requester_user_id,
                assignee_user_id: None,
                created_at: now,
                updated_at: now,
            },
            organization_id: command.organization_id,
            closed_at: None,
        })
    }

    async fn list_tickets_for_requester(
        &self,
        tenant_id: Uuid,
        requester_user_id: Uuid,
        status: Option<&str>,
        limit: u32,
        offset: u32,
    ) -> Result<(Vec<TicketSummary>, u64), CustomerServiceError> {
        let (total, rows) = if let Some(status) = status {
            let total: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*) FROM communication_cs_ticket
                WHERE tenant_id = $1 AND requester_user_id = $2 AND status = $3
                "#,
            )
            .bind(tenant_id)
            .bind(requester_user_id)
            .bind(status)
            .fetch_one(&self.pool)
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

            let rows = sqlx::query(
                r#"
                SELECT id, ticket_no, subject, status, priority, channel, requester_user_id,
                       assignee_user_id, created_at, updated_at
                FROM communication_cs_ticket
                WHERE tenant_id = $1 AND requester_user_id = $2 AND status = $3
                ORDER BY updated_at DESC
                LIMIT $4 OFFSET $5
                "#,
            )
            .bind(tenant_id)
            .bind(requester_user_id)
            .bind(status)
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&self.pool)
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
            (total, rows)
        } else {
            let total: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*) FROM communication_cs_ticket
                WHERE tenant_id = $1 AND requester_user_id = $2
                "#,
            )
            .bind(tenant_id)
            .bind(requester_user_id)
            .fetch_one(&self.pool)
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

            let rows = sqlx::query(
                r#"
                SELECT id, ticket_no, subject, status, priority, channel, requester_user_id,
                       assignee_user_id, created_at, updated_at
                FROM communication_cs_ticket
                WHERE tenant_id = $1 AND requester_user_id = $2
                ORDER BY updated_at DESC
                LIMIT $3 OFFSET $4
                "#,
            )
            .bind(tenant_id)
            .bind(requester_user_id)
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&self.pool)
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
            (total, rows)
        };

        Ok((
            rows.into_iter().map(map_ticket_summary).collect(),
            total as u64,
        ))
    }

    async fn list_tickets_for_admin(
        &self,
        tenant_id: Uuid,
        status: Option<&str>,
        limit: u32,
        offset: u32,
    ) -> Result<(Vec<TicketSummary>, u64), CustomerServiceError> {
        let (total, rows) = if let Some(status) = status {
            let total: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM communication_cs_ticket WHERE tenant_id = $1 AND status = $2",
            )
            .bind(tenant_id)
            .bind(status)
            .fetch_one(&self.pool)
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

            let rows = sqlx::query(
                r#"
                SELECT id, ticket_no, subject, status, priority, channel, requester_user_id,
                       assignee_user_id, created_at, updated_at
                FROM communication_cs_ticket
                WHERE tenant_id = $1 AND status = $2
                ORDER BY updated_at DESC
                LIMIT $3 OFFSET $4
                "#,
            )
            .bind(tenant_id)
            .bind(status)
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&self.pool)
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
            (total, rows)
        } else {
            let total: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM communication_cs_ticket WHERE tenant_id = $1",
            )
            .bind(tenant_id)
            .fetch_one(&self.pool)
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

            let rows = sqlx::query(
                r#"
                SELECT id, ticket_no, subject, status, priority, channel, requester_user_id,
                       assignee_user_id, created_at, updated_at
                FROM communication_cs_ticket
                WHERE tenant_id = $1
                ORDER BY updated_at DESC
                LIMIT $2 OFFSET $3
                "#,
            )
            .bind(tenant_id)
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&self.pool)
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
            (total, rows)
        };

        Ok((
            rows.into_iter().map(map_ticket_summary).collect(),
            total as u64,
        ))
    }

    async fn retrieve_ticket(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Option<TicketDetail>, CustomerServiceError> {
        let row = sqlx::query(
            r#"
            SELECT id, tenant_id, organization_id, ticket_no, subject, status, priority, channel,
                   requester_user_id, assignee_user_id, created_at, updated_at, closed_at
            FROM communication_cs_ticket
            WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(ticket_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(row.map(map_ticket_detail))
    }

    async fn update_ticket(
        &self,
        command: UpdateTicketCommand,
    ) -> Result<TicketDetail, CustomerServiceError> {
        let existing = self
            .retrieve_ticket(command.tenant_id, command.ticket_id)
            .await?
            .ok_or_else(|| CustomerServiceError::NotFound("ticket not found".to_owned()))?;

        let status = command
            .status
            .unwrap_or_else(|| existing.summary.status.clone());
        let priority = command
            .priority
            .unwrap_or_else(|| existing.summary.priority.clone());
        let assignee_user_id = command
            .assignee_user_id
            .or(existing.summary.assignee_user_id);
        let now = Utc::now();
        let closed_at = if status == "closed" {
            Some(existing.closed_at.unwrap_or(now))
        } else {
            None
        };

        sqlx::query(
            r#"
            UPDATE communication_cs_ticket
            SET status = $3, priority = $4, assignee_user_id = $5, updated_at = $6, closed_at = $7
            WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(command.tenant_id)
        .bind(command.ticket_id)
        .bind(&status)
        .bind(&priority)
        .bind(assignee_user_id)
        .bind(now)
        .bind(closed_at)
        .execute(&self.pool)
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        self.retrieve_ticket(command.tenant_id, command.ticket_id)
            .await?
            .ok_or_else(|| CustomerServiceError::NotFound("ticket not found".to_owned()))
    }

    async fn append_message(
        &self,
        command: SendMessageCommand,
    ) -> Result<TicketMessage, CustomerServiceError> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO communication_cs_ticket_message (
              id, tenant_id, ticket_id, author_user_id, author_role, body, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(id)
        .bind(command.tenant_id)
        .bind(command.ticket_id)
        .bind(command.author_user_id)
        .bind(&command.author_role)
        .bind(&command.body)
        .bind(now)
        .execute(&self.pool)
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        sqlx::query(
            "UPDATE communication_cs_ticket SET updated_at = $3 WHERE tenant_id = $1 AND id = $2",
        )
        .bind(command.tenant_id)
        .bind(command.ticket_id)
        .bind(now)
        .execute(&self.pool)
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(TicketMessage {
            id,
            ticket_id: command.ticket_id,
            author_user_id: command.author_user_id,
            author_role: command.author_role,
            body: command.body,
            created_at: now,
        })
    }

    async fn list_messages(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
        limit: u32,
        offset: u32,
    ) -> Result<(Vec<TicketMessage>, u64), CustomerServiceError> {
        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM communication_cs_ticket_message
            WHERE tenant_id = $1 AND ticket_id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(ticket_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        let rows = sqlx::query(
            r#"
            SELECT id, ticket_id, author_user_id, author_role, body, created_at
            FROM communication_cs_ticket_message
            WHERE tenant_id = $1 AND ticket_id = $2
            ORDER BY created_at ASC
            LIMIT $3 OFFSET $4
            "#,
        )
        .bind(tenant_id)
        .bind(ticket_id)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok((
            rows.into_iter().map(map_ticket_message).collect(),
            total as u64,
        ))
    }

    async fn register_attachment(
        &self,
        command: RegisterAttachmentCommand,
    ) -> Result<TicketAttachment, CustomerServiceError> {
        let id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO communication_cs_ticket_attachment (
              id, tenant_id, ticket_id, drive_node_id, file_name, content_type, size_bytes,
              uploaded_by_user_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            "#,
        )
        .bind(id)
        .bind(command.tenant_id)
        .bind(command.ticket_id)
        .bind(command.drive_node_id)
        .bind(&command.file_name)
        .bind(&command.content_type)
        .bind(command.size_bytes)
        .bind(command.uploaded_by_user_id)
        .bind(now)
        .execute(&self.pool)
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(TicketAttachment {
            id,
            ticket_id: command.ticket_id,
            drive_node_id: command.drive_node_id,
            file_name: command.file_name,
            content_type: command.content_type,
            size_bytes: command.size_bytes,
            uploaded_by_user_id: command.uploaded_by_user_id,
            created_at: now,
        })
    }

    async fn list_attachments(
        &self,
        tenant_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<Vec<TicketAttachment>, CustomerServiceError> {
        let rows = sqlx::query(
            r#"
            SELECT id, ticket_id, drive_node_id, file_name, content_type, size_bytes,
                   uploaded_by_user_id, created_at
            FROM communication_cs_ticket_attachment
            WHERE tenant_id = $1 AND ticket_id = $2
            ORDER BY created_at ASC
            "#,
        )
        .bind(tenant_id)
        .bind(ticket_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(rows.into_iter().map(map_ticket_attachment).collect())
    }
}

fn map_ticket_summary(row: sqlx::postgres::PgRow) -> TicketSummary {
    TicketSummary {
        id: row.get("id"),
        ticket_no: row.get("ticket_no"),
        subject: row.get("subject"),
        status: row.get("status"),
        priority: row.get("priority"),
        channel: row.get("channel"),
        requester_user_id: row.get("requester_user_id"),
        assignee_user_id: row.get("assignee_user_id"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

fn map_ticket_detail(row: sqlx::postgres::PgRow) -> TicketDetail {
    TicketDetail {
        summary: TicketSummary {
            id: row.get("id"),
            ticket_no: row.get("ticket_no"),
            subject: row.get("subject"),
            status: row.get("status"),
            priority: row.get("priority"),
            channel: row.get("channel"),
            requester_user_id: row.get("requester_user_id"),
            assignee_user_id: row.get("assignee_user_id"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        },
        organization_id: row.get("organization_id"),
        closed_at: row.get("closed_at"),
    }
}

fn map_ticket_message(row: sqlx::postgres::PgRow) -> TicketMessage {
    TicketMessage {
        id: row.get("id"),
        ticket_id: row.get("ticket_id"),
        author_user_id: row.get("author_user_id"),
        author_role: row.get("author_role"),
        body: row.get("body"),
        created_at: row.get("created_at"),
    }
}

fn map_ticket_attachment(row: sqlx::postgres::PgRow) -> TicketAttachment {
    TicketAttachment {
        id: row.get("id"),
        ticket_id: row.get("ticket_id"),
        drive_node_id: row.get("drive_node_id"),
        file_name: row.get("file_name"),
        content_type: row.get("content_type"),
        size_bytes: row.get("size_bytes"),
        uploaded_by_user_id: row.get("uploaded_by_user_id"),
        created_at: row.get("created_at"),
    }
}
