use async_trait::async_trait;
use chrono::Utc;
use sdkwork_communication_customerservice_service::{
    goofish_delivery_block_rule_catalog, goofish_order_status_rank, AutoReplyRuleSummary,
    ChannelAccountSummary, ChannelPluginRepository, ConversationBridgeContext,
    CreateAutoReplyRuleCommand, CreateChannelAccountCommand, CustomerServiceError,
    DeliveryBlockRuleSummary, PersistChannelMessageCommand, PluginCatalogEntry,
    PluginEnablementSummary, UpdateAutoReplyRuleCommand, UpdateChannelAccountCommand,
    UpsertChannelCredentialCommand, UpsertDeliveryBlockRuleItem, UpsertGoofishOrderOverlayCommand,
    UpsertPluginEnablementCommand,
};
use sqlx::Row;
use uuid::Uuid;

use super::SqlxCustomerServiceRepository;

#[async_trait]
impl ChannelPluginRepository for SqlxCustomerServiceRepository {
    async fn list_plugin_catalog(&self) -> Result<Vec<PluginCatalogEntry>, CustomerServiceError> {
        let rows = sqlx::query(
            r#"
            SELECT id, plugin_code, display_name, version, capabilities, status, created_at, updated_at
            FROM communication_cs_plugin_catalog
            ORDER BY plugin_code ASC
            "#,
        )
        .fetch_all(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(rows.into_iter().map(map_plugin_catalog).collect())
    }

    async fn list_channel_accounts(
        &self,
        tenant_id: Uuid,
        plugin_code: Option<&str>,
        limit: u32,
        offset: u32,
    ) -> Result<(Vec<ChannelAccountSummary>, u64), CustomerServiceError> {
        let (total, rows) = if let Some(plugin_code) = plugin_code {
            let total: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*)
                FROM communication_cs_channel_account
                WHERE tenant_id = $1 AND plugin_code = $2
                "#,
            )
            .bind(tenant_id)
            .bind(plugin_code)
            .fetch_one(self.pg_pool())
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

            let rows = sqlx::query(
                r#"
                SELECT a.id, a.tenant_id, a.organization_id, a.plugin_code, a.external_account_id,
                       a.display_name, a.status, a.enabled, a.owner_user_id, a.created_at, a.updated_at,
                       r.connection_state
                FROM communication_cs_channel_account a
                LEFT JOIN communication_cs_channel_account_runtime r ON r.account_id = a.id
                WHERE a.tenant_id = $1 AND a.plugin_code = $2
                ORDER BY a.updated_at DESC
                LIMIT $3 OFFSET $4
                "#,
            )
            .bind(tenant_id)
            .bind(plugin_code)
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(self.pg_pool())
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
            (total, rows)
        } else {
            let total: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM communication_cs_channel_account WHERE tenant_id = $1",
            )
            .bind(tenant_id)
            .fetch_one(self.pg_pool())
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

            let rows = sqlx::query(
                r#"
                SELECT a.id, a.tenant_id, a.organization_id, a.plugin_code, a.external_account_id,
                       a.display_name, a.status, a.enabled, a.owner_user_id, a.created_at, a.updated_at,
                       r.connection_state
                FROM communication_cs_channel_account a
                LEFT JOIN communication_cs_channel_account_runtime r ON r.account_id = a.id
                WHERE a.tenant_id = $1
                ORDER BY a.updated_at DESC
                LIMIT $2 OFFSET $3
                "#,
            )
            .bind(tenant_id)
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(self.pg_pool())
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
            (total, rows)
        };

        Ok((
            rows.into_iter().map(map_channel_account).collect(),
            total as u64,
        ))
    }

    async fn get_conversation_bridge_context(
        &self,
        conversation_id: Uuid,
    ) -> Result<Option<ConversationBridgeContext>, CustomerServiceError> {
        let row = sqlx::query(
            r#"
            SELECT c.tenant_id, c.account_id, c.external_conversation_id, c.subject, c.ticket_id,
                   a.organization_id, a.plugin_code, a.owner_user_id
            FROM communication_cs_channel_conversation c
            INNER JOIN communication_cs_channel_account a ON a.id = c.account_id
            WHERE c.id = $1
            "#,
        )
        .bind(conversation_id)
        .fetch_optional(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(row.map(|row| ConversationBridgeContext {
            tenant_id: row.get("tenant_id"),
            organization_id: row.get("organization_id"),
            account_id: row.get("account_id"),
            plugin_code: row.get("plugin_code"),
            owner_user_id: row.get("owner_user_id"),
            external_conversation_id: row.get("external_conversation_id"),
            subject: row.get("subject"),
            ticket_id: row.get("ticket_id"),
        }))
    }

    async fn ensure_conversation(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        external_conversation_id: &str,
        external_buyer_id: Option<&str>,
        external_item_id: Option<&str>,
        subject: Option<&str>,
    ) -> Result<Uuid, CustomerServiceError> {
        let existing: Option<Uuid> = sqlx::query_scalar(
            r#"
            SELECT id FROM communication_cs_channel_conversation
            WHERE tenant_id = $1 AND account_id = $2 AND external_conversation_id = $3
            "#,
        )
        .bind(tenant_id)
        .bind(account_id)
        .bind(external_conversation_id)
        .fetch_optional(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        if let Some(id) = existing {
            let now = Utc::now();
            sqlx::query(
                r#"
                UPDATE communication_cs_channel_conversation
                SET last_message_at = $4, updated_at = $4,
                    external_buyer_id = COALESCE($5, external_buyer_id),
                    external_item_id = COALESCE($6, external_item_id),
                    subject = COALESCE($7, subject)
                WHERE id = $1 AND tenant_id = $2 AND account_id = $3
                "#,
            )
            .bind(id)
            .bind(tenant_id)
            .bind(account_id)
            .bind(now)
            .bind(external_buyer_id)
            .bind(external_item_id)
            .bind(subject)
            .execute(self.pg_pool())
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
            return Ok(id);
        }

        let id = Uuid::new_v4();
        let now = Utc::now();
        sqlx::query(
            r#"
            INSERT INTO communication_cs_channel_conversation (
              id, tenant_id, account_id, external_conversation_id, external_buyer_id,
              external_item_id, subject, last_message_at, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8)
            "#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(account_id)
        .bind(external_conversation_id)
        .bind(external_buyer_id)
        .bind(external_item_id)
        .bind(subject)
        .bind(now)
        .execute(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(id)
    }

    async fn get_conversation_external_buyer(
        &self,
        account_id: Uuid,
        external_conversation_id: &str,
    ) -> Result<Option<String>, CustomerServiceError> {
        let buyer_id: Option<String> = sqlx::query_scalar(
            r#"
            SELECT external_buyer_id
            FROM communication_cs_channel_conversation
            WHERE account_id = $1 AND external_conversation_id = $2
            "#,
        )
        .bind(account_id)
        .bind(external_conversation_id)
        .fetch_optional(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?
        .flatten();

        Ok(buyer_id.filter(|value| !value.is_empty()))
    }

    async fn persist_channel_message(
        &self,
        command: PersistChannelMessageCommand,
    ) -> Result<Uuid, CustomerServiceError> {
        let existing: Option<Uuid> = sqlx::query_scalar(
            r#"
            SELECT id FROM communication_cs_channel_message
            WHERE tenant_id = $1 AND conversation_id = $2 AND external_message_id = $3
            "#,
        )
        .bind(command.tenant_id)
        .bind(command.conversation_id)
        .bind(&command.external_message_id)
        .fetch_optional(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        if let Some(id) = existing {
            return Ok(id);
        }

        let id = Uuid::new_v4();
        let now = Utc::now();
        sqlx::query(
            r#"
            INSERT INTO communication_cs_channel_message (
              id, tenant_id, conversation_id, external_message_id, direction, message_kind,
              body, raw_payload, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            "#,
        )
        .bind(id)
        .bind(command.tenant_id)
        .bind(command.conversation_id)
        .bind(&command.external_message_id)
        .bind(&command.direction)
        .bind(&command.message_kind)
        .bind(&command.body)
        .bind(command.raw_payload)
        .bind(now)
        .execute(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        sqlx::query(
            r#"
            UPDATE communication_cs_channel_conversation
            SET last_message_at = $3, updated_at = $3
            WHERE id = $1 AND tenant_id = $2
            "#,
        )
        .bind(command.conversation_id)
        .bind(command.tenant_id)
        .bind(now)
        .execute(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(id)
    }

    async fn link_conversation_ticket(
        &self,
        tenant_id: Uuid,
        conversation_id: Uuid,
        ticket_id: Uuid,
    ) -> Result<(), CustomerServiceError> {
        let now = Utc::now();
        let updated = sqlx::query(
            r#"
            UPDATE communication_cs_channel_conversation
            SET ticket_id = $3, updated_at = $4
            WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(conversation_id)
        .bind(ticket_id)
        .bind(now)
        .execute(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        if updated.rows_affected() == 0 {
            return Err(CustomerServiceError::NotFound(
                "conversation not found".to_owned(),
            ));
        }
        Ok(())
    }

    async fn create_channel_account(
        &self,
        command: CreateChannelAccountCommand,
    ) -> Result<ChannelAccountSummary, CustomerServiceError> {
        let id = Uuid::new_v4();
        let runtime_id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO communication_cs_channel_account (
              id, tenant_id, organization_id, plugin_code, external_account_id,
              display_name, status, enabled, owner_user_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'disabled', FALSE, $7, $8, $8)
            "#,
        )
        .bind(id)
        .bind(command.tenant_id)
        .bind(command.organization_id)
        .bind(&command.plugin_code)
        .bind(&command.external_account_id)
        .bind(&command.display_name)
        .bind(command.owner_user_id)
        .bind(now)
        .execute(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        sqlx::query(
            r#"
            INSERT INTO communication_cs_channel_account_runtime (
              id, tenant_id, account_id, connection_state, created_at, updated_at
            ) VALUES ($1, $2, $3, 'disconnected', $4, $4)
            "#,
        )
        .bind(runtime_id)
        .bind(command.tenant_id)
        .bind(id)
        .bind(now)
        .execute(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(ChannelAccountSummary {
            id,
            tenant_id: command.tenant_id,
            organization_id: command.organization_id,
            plugin_code: command.plugin_code,
            external_account_id: command.external_account_id,
            display_name: command.display_name,
            status: "disabled".to_owned(),
            enabled: false,
            owner_user_id: command.owner_user_id,
            connection_state: Some("disconnected".to_owned()),
            created_at: now,
            updated_at: now,
        })
    }

    async fn get_channel_account_by_id(
        &self,
        account_id: Uuid,
    ) -> Result<Option<ChannelAccountSummary>, CustomerServiceError> {
        let row = sqlx::query(
            r#"
            SELECT a.id, a.tenant_id, a.organization_id, a.plugin_code, a.external_account_id,
                   a.display_name, a.status, a.enabled, a.owner_user_id, a.created_at, a.updated_at,
                   r.connection_state
            FROM communication_cs_channel_account a
            LEFT JOIN communication_cs_channel_account_runtime r ON r.account_id = a.id
            WHERE a.id = $1
            "#,
        )
        .bind(account_id)
        .fetch_optional(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(row.map(map_channel_account))
    }

    async fn upsert_channel_credential(
        &self,
        command: UpsertChannelCredentialCommand,
    ) -> Result<(), CustomerServiceError> {
        let existing: Option<Uuid> = sqlx::query_scalar(
            r#"
            SELECT id FROM communication_cs_channel_account_credential
            WHERE tenant_id = $1 AND account_id = $2 AND credential_kind = $3
            "#,
        )
        .bind(command.tenant_id)
        .bind(command.account_id)
        .bind(&command.credential_kind)
        .fetch_optional(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        let now = Utc::now();
        if let Some(id) = existing {
            sqlx::query(
                r#"
                UPDATE communication_cs_channel_account_credential
                SET encrypted_payload = $2, key_version = $3, updated_at = $4
                WHERE id = $1
                "#,
            )
            .bind(id)
            .bind(&command.payload)
            .bind(&command.key_version)
            .bind(now)
            .execute(self.pg_pool())
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
        } else {
            sqlx::query(
                r#"
                INSERT INTO communication_cs_channel_account_credential (
                  id, tenant_id, account_id, credential_kind, encrypted_payload, key_version, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(command.tenant_id)
            .bind(command.account_id)
            .bind(&command.credential_kind)
            .bind(&command.payload)
            .bind(&command.key_version)
            .bind(now)
            .execute(self.pg_pool())
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
        }
        Ok(())
    }

    async fn load_channel_credential(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        credential_kind: &str,
    ) -> Result<Option<String>, CustomerServiceError> {
        let row: Option<(Vec<u8>, String)> = sqlx::query_as(
            r#"
            SELECT encrypted_payload, key_version
            FROM communication_cs_channel_account_credential
            WHERE tenant_id = $1 AND account_id = $2 AND credential_kind = $3
            "#,
        )
        .bind(tenant_id)
        .bind(account_id)
        .bind(credential_kind)
        .fetch_optional(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(row.map(|(payload, key_version)| decode_credential_payload(&payload, &key_version)))
    }

    async fn update_channel_account_runtime_state(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        connection_state: &str,
        last_error_code: Option<&str>,
        last_error_message: Option<&str>,
    ) -> Result<(), CustomerServiceError> {
        let now = Utc::now();
        sqlx::query(
            r#"
            UPDATE communication_cs_channel_account_runtime
            SET connection_state = $3, last_error_code = $4, last_error_message = $5, updated_at = $6
            WHERE tenant_id = $1 AND account_id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(account_id)
        .bind(connection_state)
        .bind(last_error_code)
        .bind(last_error_message)
        .bind(now)
        .execute(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
        Ok(())
    }

    async fn list_auto_reply_rules(
        &self,
        tenant_id: Uuid,
        plugin_code: Option<&str>,
        account_id: Option<Uuid>,
        limit: u32,
        offset: u32,
    ) -> Result<(Vec<AutoReplyRuleSummary>, u64), CustomerServiceError> {
        let rows = sqlx::query(
            r#"
            SELECT id, tenant_id, account_id, plugin_code, rule_kind, priority, enabled,
                   match_pattern, reply_content, created_at, updated_at
            FROM communication_cs_auto_reply_rule
            WHERE tenant_id = $1
              AND ($2::text IS NULL OR plugin_code = $2)
              AND ($3::uuid IS NULL OR account_id = $3)
            ORDER BY priority ASC, updated_at DESC
            LIMIT $4 OFFSET $5
            "#,
        )
        .bind(tenant_id)
        .bind(plugin_code)
        .bind(account_id)
        .bind(limit as i64)
        .bind(offset as i64)
        .fetch_all(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM communication_cs_auto_reply_rule
            WHERE tenant_id = $1
              AND ($2::text IS NULL OR plugin_code = $2)
              AND ($3::uuid IS NULL OR account_id = $3)
            "#,
        )
        .bind(tenant_id)
        .bind(plugin_code)
        .bind(account_id)
        .fetch_one(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok((
            rows.into_iter().map(map_auto_reply_rule).collect(),
            total as u64,
        ))
    }

    async fn create_auto_reply_rule(
        &self,
        command: CreateAutoReplyRuleCommand,
    ) -> Result<AutoReplyRuleSummary, CustomerServiceError> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let priority = command.priority.unwrap_or(100);
        let enabled = command.enabled.unwrap_or(true);

        sqlx::query(
            r#"
            INSERT INTO communication_cs_auto_reply_rule (
              id, tenant_id, account_id, plugin_code, rule_kind, priority, enabled,
              match_pattern, reply_content, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
            "#,
        )
        .bind(id)
        .bind(command.tenant_id)
        .bind(command.account_id)
        .bind(&command.plugin_code)
        .bind(&command.rule_kind)
        .bind(priority)
        .bind(enabled)
        .bind(&command.match_pattern)
        .bind(&command.reply_content)
        .bind(now)
        .execute(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(AutoReplyRuleSummary {
            id,
            tenant_id: command.tenant_id,
            account_id: command.account_id,
            plugin_code: command.plugin_code,
            rule_kind: command.rule_kind,
            priority,
            enabled,
            match_pattern: command.match_pattern,
            reply_content: Some(command.reply_content),
            created_at: now,
            updated_at: now,
        })
    }

    async fn update_channel_account(
        &self,
        command: UpdateChannelAccountCommand,
    ) -> Result<ChannelAccountSummary, CustomerServiceError> {
        let now = Utc::now();
        let row = sqlx::query(
            r#"
            UPDATE communication_cs_channel_account
            SET display_name = COALESCE($3, display_name),
                enabled = COALESCE($4, enabled),
                status = COALESCE($5, status),
                updated_at = $6
            WHERE tenant_id = $1 AND id = $2
            RETURNING id, tenant_id, organization_id, plugin_code, external_account_id,
                      display_name, status, enabled, owner_user_id, created_at, updated_at,
                      (
                        SELECT connection_state
                        FROM communication_cs_channel_account_runtime runtime
                        WHERE runtime.account_id = communication_cs_channel_account.id
                      ) AS connection_state
            "#,
        )
        .bind(command.tenant_id)
        .bind(command.account_id)
        .bind(command.display_name)
        .bind(command.enabled)
        .bind(command.status)
        .bind(now)
        .fetch_optional(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        row.map(map_channel_account)
            .ok_or_else(|| CustomerServiceError::NotFound("channel account not found".to_owned()))
    }

    async fn update_auto_reply_rule(
        &self,
        command: UpdateAutoReplyRuleCommand,
    ) -> Result<AutoReplyRuleSummary, CustomerServiceError> {
        let now = Utc::now();
        let row = sqlx::query(
            r#"
            UPDATE communication_cs_auto_reply_rule
            SET priority = COALESCE($3, priority),
                enabled = COALESCE($4, enabled),
                match_pattern = COALESCE($5, match_pattern),
                reply_content = COALESCE($6, reply_content),
                updated_at = $7
            WHERE tenant_id = $1 AND id = $2
            RETURNING id, tenant_id, account_id, plugin_code, rule_kind, priority, enabled,
                      match_pattern, reply_content, created_at, updated_at
            "#,
        )
        .bind(command.tenant_id)
        .bind(command.rule_id)
        .bind(command.priority)
        .bind(command.enabled)
        .bind(command.match_pattern)
        .bind(command.reply_content)
        .bind(now)
        .fetch_optional(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        row.map(map_auto_reply_rule)
            .ok_or_else(|| CustomerServiceError::NotFound("auto-reply rule not found".to_owned()))
    }

    async fn delete_auto_reply_rule(
        &self,
        tenant_id: Uuid,
        rule_id: Uuid,
    ) -> Result<(), CustomerServiceError> {
        let result = sqlx::query(
            r#"
            DELETE FROM communication_cs_auto_reply_rule
            WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(rule_id)
        .execute(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CustomerServiceError::NotFound(
                "auto-reply rule not found".to_owned(),
            ));
        }
        Ok(())
    }

    async fn list_delivery_block_rules_for_account(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
    ) -> Result<Vec<DeliveryBlockRuleSummary>, CustomerServiceError> {
        let rows = sqlx::query(
            r#"
            SELECT id, rule_code, priority, enabled, excluded_external_item_ids, action_config
            FROM communication_cs_delivery_block_rule
            WHERE tenant_id = $1 AND account_id = $2
            ORDER BY priority ASC, updated_at DESC
            "#,
        )
        .bind(tenant_id)
        .bind(account_id)
        .fetch_all(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        let catalog = goofish_delivery_block_rule_catalog();
        let existing: std::collections::HashMap<String, _> = rows
            .into_iter()
            .map(|row| {
                (
                    row.get::<String, _>("rule_code"),
                    (
                        row.get::<Uuid, _>("id"),
                        row.get::<i32, _>("priority"),
                        row.get::<bool, _>("enabled"),
                        row.get::<serde_json::Value, _>("excluded_external_item_ids"),
                        row.get::<serde_json::Value, _>("action_config"),
                    ),
                )
            })
            .collect();

        let mut merged = Vec::new();
        for entry in catalog {
            if let Some((id, priority, enabled, excluded, action_config)) =
                existing.get(&entry.rule_code)
            {
                merged.push(DeliveryBlockRuleSummary {
                    id: Some(*id),
                    rule_code: entry.rule_code.clone(),
                    rule_name: entry.rule_name.clone(),
                    rule_description: entry.rule_description.clone(),
                    enabled: *enabled,
                    priority: *priority,
                    excluded_external_item_ids: json_string_array(excluded),
                    action_config: action_config.clone(),
                    default_action_config: entry.default_action_config.clone(),
                });
            } else {
                merged.push(DeliveryBlockRuleSummary {
                    id: None,
                    rule_code: entry.rule_code.clone(),
                    rule_name: entry.rule_name.clone(),
                    rule_description: entry.rule_description.clone(),
                    enabled: false,
                    priority: entry.default_priority,
                    excluded_external_item_ids: Vec::new(),
                    action_config: entry.default_action_config.clone(),
                    default_action_config: entry.default_action_config.clone(),
                });
            }
        }
        merged.sort_by_key(|rule| rule.priority);
        Ok(merged)
    }

    async fn upsert_delivery_block_rules(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        plugin_code: &str,
        items: Vec<UpsertDeliveryBlockRuleItem>,
    ) -> Result<Vec<DeliveryBlockRuleSummary>, CustomerServiceError> {
        let now = Utc::now();
        for item in items {
            let excluded = serde_json::json!(item.excluded_external_item_ids.unwrap_or_default());
            let action_config = item.action_config.unwrap_or_else(|| serde_json::json!({}));

            let existing: Option<Uuid> = sqlx::query_scalar(
                r#"
                SELECT id FROM communication_cs_delivery_block_rule
                WHERE tenant_id = $1 AND account_id = $2 AND rule_code = $3
                "#,
            )
            .bind(tenant_id)
            .bind(account_id)
            .bind(&item.rule_code)
            .fetch_optional(self.pg_pool())
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

            if let Some(id) = existing {
                sqlx::query(
                    r#"
                    UPDATE communication_cs_delivery_block_rule
                    SET enabled = $2, priority = $3, excluded_external_item_ids = $4,
                        action_config = $5, updated_at = $6
                    WHERE id = $1
                    "#,
                )
                .bind(id)
                .bind(item.enabled)
                .bind(item.priority)
                .bind(excluded)
                .bind(action_config)
                .bind(now)
                .execute(self.pg_pool())
                .await
                .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
            } else {
                sqlx::query(
                    r#"
                    INSERT INTO communication_cs_delivery_block_rule (
                      id, tenant_id, account_id, plugin_code, rule_code, priority, enabled,
                      excluded_external_item_ids, action_config, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
                    "#,
                )
                .bind(Uuid::new_v4())
                .bind(tenant_id)
                .bind(account_id)
                .bind(plugin_code)
                .bind(&item.rule_code)
                .bind(item.priority)
                .bind(item.enabled)
                .bind(excluded)
                .bind(action_config)
                .bind(now)
                .execute(self.pg_pool())
                .await
                .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
            }
        }

        self.list_delivery_block_rules_for_account(tenant_id, account_id)
            .await
    }

    async fn list_plugin_enablement_for_tenant(
        &self,
        tenant_id: Uuid,
    ) -> Result<Vec<PluginEnablementSummary>, CustomerServiceError> {
        let rows = sqlx::query(
            r#"
            SELECT id, tenant_id, plugin_code, enabled, config, created_at, updated_at
            FROM communication_cs_plugin_enablement
            WHERE tenant_id = $1
            ORDER BY plugin_code ASC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(rows.into_iter().map(map_plugin_enablement).collect())
    }

    async fn upsert_plugin_enablement(
        &self,
        command: UpsertPluginEnablementCommand,
    ) -> Result<PluginEnablementSummary, CustomerServiceError> {
        let now = Utc::now();
        let config = command.config.unwrap_or_else(|| serde_json::json!({}));
        let existing: Option<Uuid> = sqlx::query_scalar(
            r#"
            SELECT id FROM communication_cs_plugin_enablement
            WHERE tenant_id = $1 AND plugin_code = $2
            "#,
        )
        .bind(command.tenant_id)
        .bind(&command.plugin_code)
        .fetch_optional(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        let id = if let Some(id) = existing {
            sqlx::query(
                r#"
                UPDATE communication_cs_plugin_enablement
                SET enabled = $3, config = $4, updated_at = $5
                WHERE id = $1 AND tenant_id = $2
                "#,
            )
            .bind(id)
            .bind(command.tenant_id)
            .bind(command.enabled)
            .bind(&config)
            .bind(now)
            .execute(self.pg_pool())
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
            id
        } else {
            let id = Uuid::new_v4();
            sqlx::query(
                r#"
                INSERT INTO communication_cs_plugin_enablement (
                    id, tenant_id, plugin_code, enabled, config, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $6)
                "#,
            )
            .bind(id)
            .bind(command.tenant_id)
            .bind(&command.plugin_code)
            .bind(command.enabled)
            .bind(&config)
            .bind(now)
            .execute(self.pg_pool())
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;
            id
        };

        let row = sqlx::query(
            r#"
            SELECT id, tenant_id, plugin_code, enabled, config, created_at, updated_at
            FROM communication_cs_plugin_enablement
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_one(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(map_plugin_enablement(row))
    }

    async fn count_goofish_buyer_orders(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        buyer_external_id: &str,
        exclude_external_order_id: &str,
        external_item_id: Option<&str>,
    ) -> Result<u64, CustomerServiceError> {
        let count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM communication_cs_plugin_goofish_order
            WHERE tenant_id = $1
              AND account_id = $2
              AND buyer_external_id = $3
              AND external_order_id <> $4
              AND ($5::text IS NULL OR external_item_id = $5)
            "#,
        )
        .bind(tenant_id)
        .bind(account_id)
        .bind(buyer_external_id)
        .bind(exclude_external_order_id)
        .bind(external_item_id)
        .fetch_one(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(count.max(0) as u64)
    }

    async fn count_goofish_unconfirmed_buyer_orders(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
        buyer_external_id: &str,
        exclude_external_order_id: &str,
        external_item_id: Option<&str>,
    ) -> Result<u64, CustomerServiceError> {
        let count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM communication_cs_plugin_goofish_order
            WHERE tenant_id = $1
              AND account_id = $2
              AND buyer_external_id = $3
              AND external_order_id <> $4
              AND order_status = 'shipped'
              AND ($5::text IS NULL OR external_item_id = $5)
            "#,
        )
        .bind(tenant_id)
        .bind(account_id)
        .bind(buyer_external_id)
        .bind(exclude_external_order_id)
        .bind(external_item_id)
        .fetch_one(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(count.max(0) as u64)
    }

    async fn upsert_goofish_order_overlay(
        &self,
        command: UpsertGoofishOrderOverlayCommand,
    ) -> Result<Uuid, CustomerServiceError> {
        let now = Utc::now();
        let existing = sqlx::query(
            r#"
            SELECT id, order_status
            FROM communication_cs_plugin_goofish_order
            WHERE tenant_id = $1 AND account_id = $2 AND external_order_id = $3
            "#,
        )
        .bind(command.tenant_id)
        .bind(command.account_id)
        .bind(&command.external_order_id)
        .fetch_optional(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        if let Some(row) = existing {
            let id: Uuid = row.get("id");
            let current_status: String = row.get("order_status");
            let order_status = if goofish_order_status_rank(&command.order_status)
                >= goofish_order_status_rank(&current_status)
            {
                command.order_status
            } else {
                current_status
            };

            sqlx::query(
                r#"
                UPDATE communication_cs_plugin_goofish_order
                SET conversation_id = COALESCE($2, conversation_id),
                    external_item_id = COALESCE($3, external_item_id),
                    buyer_external_id = COALESCE($4, buyer_external_id),
                    order_status = $5,
                    updated_at = $6
                WHERE id = $1
                "#,
            )
            .bind(id)
            .bind(command.conversation_id)
            .bind(&command.external_item_id)
            .bind(&command.buyer_external_id)
            .bind(&order_status)
            .bind(now)
            .execute(self.pg_pool())
            .await
            .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

            return Ok(id);
        }

        let id = Uuid::new_v4();
        sqlx::query(
            r#"
            INSERT INTO communication_cs_plugin_goofish_order (
              id, tenant_id, account_id, conversation_id, external_order_id,
              external_item_id, buyer_external_id, order_status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
            "#,
        )
        .bind(id)
        .bind(command.tenant_id)
        .bind(command.account_id)
        .bind(command.conversation_id)
        .bind(&command.external_order_id)
        .bind(&command.external_item_id)
        .bind(&command.buyer_external_id)
        .bind(&command.order_status)
        .bind(now)
        .execute(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        Ok(id)
    }

    async fn delete_channel_account(
        &self,
        tenant_id: Uuid,
        account_id: Uuid,
    ) -> Result<(), CustomerServiceError> {
        let deleted = sqlx::query(
            r#"
            DELETE FROM communication_cs_channel_account
            WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id)
        .bind(account_id)
        .execute(self.pg_pool())
        .await
        .map_err(|error| CustomerServiceError::Persistence(error.to_string()))?;

        if deleted.rows_affected() == 0 {
            return Err(CustomerServiceError::NotFound(
                "channel account not found".to_owned(),
            ));
        }

        Ok(())
    }
}

fn decode_credential_payload(payload: &[u8], _key_version: &str) -> String {
    String::from_utf8_lossy(payload).into_owned()
}

fn json_string_array(value: &serde_json::Value) -> Vec<String> {
    value
        .as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str().map(str::to_owned))
                .collect()
        })
        .unwrap_or_default()
}

fn map_auto_reply_rule(row: sqlx::postgres::PgRow) -> AutoReplyRuleSummary {
    AutoReplyRuleSummary {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        account_id: row.get("account_id"),
        plugin_code: row.get("plugin_code"),
        rule_kind: row.get("rule_kind"),
        priority: row.get("priority"),
        enabled: row.get("enabled"),
        match_pattern: row.get("match_pattern"),
        reply_content: row.get("reply_content"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

fn map_plugin_catalog(row: sqlx::postgres::PgRow) -> PluginCatalogEntry {
    PluginCatalogEntry {
        id: row.get("id"),
        plugin_code: row.get("plugin_code"),
        display_name: row.get("display_name"),
        version: row.get("version"),
        capabilities: row.get("capabilities"),
        status: row.get("status"),
        tenant_enabled: None,
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

fn map_plugin_enablement(row: sqlx::postgres::PgRow) -> PluginEnablementSummary {
    PluginEnablementSummary {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        plugin_code: row.get("plugin_code"),
        enabled: row.get("enabled"),
        config: row.get("config"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

fn map_channel_account(row: sqlx::postgres::PgRow) -> ChannelAccountSummary {
    ChannelAccountSummary {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        organization_id: row.get("organization_id"),
        plugin_code: row.get("plugin_code"),
        external_account_id: row.get("external_account_id"),
        display_name: row.get("display_name"),
        status: row.get("status"),
        enabled: row.get("enabled"),
        owner_user_id: row.get("owner_user_id"),
        connection_state: row.get("connection_state"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}
