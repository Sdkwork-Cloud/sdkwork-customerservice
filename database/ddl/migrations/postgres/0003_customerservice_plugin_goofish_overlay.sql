-- SDKWork customerservice Goofish plugin overlay tables
-- Migration: 0003_customerservice_plugin_goofish_overlay
-- Spec: plugins/sdkwork-customerservice-plugin-goofish/docs/schema-registry/overlays/goofish.tables.yaml

CREATE TABLE IF NOT EXISTS communication_cs_plugin_goofish_order (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES communication_cs_channel_account(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES communication_cs_channel_conversation(id) ON DELETE SET NULL,
  external_order_id TEXT NOT NULL,
  external_item_id TEXT,
  buyer_external_id TEXT,
  order_status TEXT NOT NULL,
  delivery_status TEXT,
  delivery_content JSONB,
  fail_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_communication_cs_plugin_goofish_order_external
  ON communication_cs_plugin_goofish_order (tenant_id, account_id, external_order_id);

CREATE INDEX IF NOT EXISTS idx_communication_cs_plugin_goofish_order_account_updated
  ON communication_cs_plugin_goofish_order (tenant_id, account_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS communication_cs_plugin_goofish_fulfillment_card (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES communication_cs_channel_account(id) ON DELETE CASCADE,
  card_name TEXT NOT NULL,
  card_kind TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_cs_plugin_goofish_fulfillment_card_account
  ON communication_cs_plugin_goofish_fulfillment_card (tenant_id, account_id, enabled);
