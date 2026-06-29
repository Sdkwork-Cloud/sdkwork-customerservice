-- SDKWork customerservice baseline (communication domain)
CREATE TABLE IF NOT EXISTS communication_cs_ticket (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  organization_id UUID,
  ticket_no TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  channel TEXT NOT NULL DEFAULT 'web',
  requester_user_id UUID NOT NULL,
  assignee_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_communication_cs_ticket_tenant_no
  ON communication_cs_ticket (tenant_id, ticket_no);

CREATE INDEX IF NOT EXISTS idx_communication_cs_ticket_tenant_status
  ON communication_cs_ticket (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_communication_cs_ticket_requester
  ON communication_cs_ticket (tenant_id, requester_user_id);

CREATE TABLE IF NOT EXISTS communication_cs_ticket_message (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  ticket_id UUID NOT NULL REFERENCES communication_cs_ticket(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'customer',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_cs_ticket_message_ticket
  ON communication_cs_ticket_message (ticket_id, created_at);

CREATE TABLE IF NOT EXISTS communication_cs_ticket_attachment (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  ticket_id UUID NOT NULL REFERENCES communication_cs_ticket(id) ON DELETE CASCADE,
  drive_node_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  uploaded_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_cs_ticket_attachment_ticket
  ON communication_cs_ticket_attachment (ticket_id, created_at);
