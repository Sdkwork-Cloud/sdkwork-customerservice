-- SDKWork customerservice plugin system (communication domain)
-- Migration: 0002_customerservice_plugin_system
-- Spec: specs/PLUGIN_SYSTEM_SPEC.md

CREATE TABLE IF NOT EXISTS communication_cs_plugin_catalog (
  id UUID PRIMARY KEY,
  plugin_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  version TEXT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_communication_cs_plugin_catalog_code
  ON communication_cs_plugin_catalog (plugin_code);

CREATE TABLE IF NOT EXISTS communication_cs_plugin_enablement (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  organization_id UUID,
  plugin_code TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_communication_cs_plugin_enablement_tenant_code
  ON communication_cs_plugin_enablement (tenant_id, plugin_code);

CREATE TABLE IF NOT EXISTS communication_cs_channel_account (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  organization_id UUID,
  plugin_code TEXT NOT NULL,
  external_account_id TEXT,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disabled',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  proxy_config JSONB,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_cs_channel_account_tenant_plugin
  ON communication_cs_channel_account (tenant_id, plugin_code, status);

CREATE UNIQUE INDEX IF NOT EXISTS ux_communication_cs_channel_account_tenant_plugin_external
  ON communication_cs_channel_account (tenant_id, plugin_code, external_account_id)
  WHERE external_account_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS communication_cs_channel_account_credential (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES communication_cs_channel_account(id) ON DELETE CASCADE,
  credential_kind TEXT NOT NULL,
  encrypted_payload BYTEA NOT NULL,
  key_version TEXT NOT NULL DEFAULT 'v1',
  expires_at TIMESTAMPTZ,
  last_rotated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_cs_channel_account_credential_account
  ON communication_cs_channel_account_credential (account_id, credential_kind);

CREATE TABLE IF NOT EXISTS communication_cs_channel_account_runtime (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES communication_cs_channel_account(id) ON DELETE CASCADE,
  connection_state TEXT NOT NULL DEFAULT 'disconnected',
  worker_instance_id TEXT,
  last_connected_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_message TEXT,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_communication_cs_channel_account_runtime_account
  ON communication_cs_channel_account_runtime (account_id);

CREATE TABLE IF NOT EXISTS communication_cs_channel_conversation (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES communication_cs_channel_account(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES communication_cs_ticket(id) ON DELETE SET NULL,
  external_conversation_id TEXT NOT NULL,
  external_buyer_id TEXT,
  external_item_id TEXT,
  subject TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_communication_cs_channel_conversation_external
  ON communication_cs_channel_conversation (tenant_id, account_id, external_conversation_id);

CREATE INDEX IF NOT EXISTS idx_communication_cs_channel_conversation_ticket
  ON communication_cs_channel_conversation (tenant_id, ticket_id);

CREATE TABLE IF NOT EXISTS communication_cs_channel_message (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  conversation_id UUID NOT NULL REFERENCES communication_cs_channel_conversation(id) ON DELETE CASCADE,
  external_message_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  message_kind TEXT NOT NULL DEFAULT 'chat',
  body TEXT NOT NULL,
  raw_payload JSONB,
  dedupe_key TEXT,
  ticket_message_id UUID REFERENCES communication_cs_ticket_message(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_communication_cs_channel_message_idempotency
  ON communication_cs_channel_message (tenant_id, conversation_id, external_message_id);

CREATE INDEX IF NOT EXISTS idx_communication_cs_channel_message_conversation_created
  ON communication_cs_channel_message (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS communication_cs_auto_reply_rule (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  organization_id UUID,
  account_id UUID REFERENCES communication_cs_channel_account(id) ON DELETE CASCADE,
  plugin_code TEXT NOT NULL,
  rule_kind TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  match_pattern TEXT,
  reply_content TEXT,
  scope_external_item_id TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_cs_auto_reply_rule_account_priority
  ON communication_cs_auto_reply_rule (tenant_id, account_id, enabled, priority);

CREATE TABLE IF NOT EXISTS communication_cs_delivery_block_rule (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  organization_id UUID,
  account_id UUID REFERENCES communication_cs_channel_account(id) ON DELETE CASCADE,
  plugin_code TEXT NOT NULL,
  rule_code TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  excluded_external_item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_cs_delivery_block_rule_account_priority
  ON communication_cs_delivery_block_rule (tenant_id, account_id, enabled, priority);

CREATE UNIQUE INDEX IF NOT EXISTS ux_communication_cs_delivery_block_rule_account_code
  ON communication_cs_delivery_block_rule (tenant_id, account_id, rule_code);

CREATE TABLE IF NOT EXISTS communication_cs_plugin_event_log (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  account_id UUID REFERENCES communication_cs_channel_account(id) ON DELETE SET NULL,
  plugin_code TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_cs_plugin_event_log_tenant_created
  ON communication_cs_plugin_event_log (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_cs_plugin_event_log_account_created
  ON communication_cs_plugin_event_log (account_id, created_at DESC);

-- Seed global plugin catalog entries (idempotent by plugin_code)
INSERT INTO communication_cs_plugin_catalog (id, plugin_code, display_name, version, capabilities, status)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'goofish',
    'Goofish / 闲鱼',
    '0.1.0',
    '["session.cookie","transport.websocket","message.chat","order.sync","delivery.auto","reply.keyword"]'::jsonb,
    'planned'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'taobao',
    'Taobao / 淘宝',
    '0.1.0',
    '["session.oauth","transport.websocket","message.chat","order.sync","reply.keyword"]'::jsonb,
    'planned'
  )
ON CONFLICT (plugin_code) DO NOTHING;
