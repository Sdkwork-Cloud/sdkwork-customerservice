export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export interface TicketSummary {
  id: string;
  ticketNo: string;
  subject: string;
  status: string;
  priority: string;
  channel: string;
  requesterUserId: string;
  assigneeUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail extends TicketSummary {
  organizationId?: string | null;
  closedAt?: string | null;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorUserId: string;
  authorRole: string;
  body: string;
  createdAt: string;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  driveNodeId: string;
  fileName: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  uploadedByUserId: string;
  createdAt: string;
}

export interface TicketListResponse {
  items: TicketSummary[];
  nextCursor?: string | null;
}

export interface TicketDetailResponse {
  data: TicketDetail;
}

export interface TicketMessageListResponse {
  items: TicketMessage[];
}

export interface TicketAttachmentListResponse {
  items: TicketAttachment[];
}

export interface CreateTicketRequest {
  organizationId?: string;
  subject: string;
  body: string;
  priority?: string;
  channel?: string;
}

export interface SendTicketMessageRequest {
  body: string;
  authorRole?: string;
}

export interface RegisterTicketAttachmentRequest {
  driveNodeId: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface UpdateTicketRequest {
  status?: string;
  priority?: string;
  assigneeUserId?: string;
}

export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  pending: "Pending",
  resolved: "Resolved",
  closed: "Closed",
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};
