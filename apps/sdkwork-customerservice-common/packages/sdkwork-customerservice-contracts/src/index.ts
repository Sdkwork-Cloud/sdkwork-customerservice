export type {
  TicketSummary,
  TicketDetail,
  TicketMessage,
  UpdateTicketRequest,
  SendTicketMessageRequest,
  PluginCatalogEntry,
} from "@sdkwork/customerservice-backend-sdk";

export type {
  CreateTicketRequest,
  RegisterTicketAttachmentRequest,
  TicketAttachment,
} from "@sdkwork/customerservice-app-sdk";

export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export const TICKET_STATUS_OPTIONS = [
  "open",
  "pending",
  "resolved",
  "closed",
] as const satisfies readonly TicketStatus[];

export const TICKET_PRIORITY_OPTIONS = [
  "low",
  "normal",
  "high",
  "urgent",
] as const satisfies readonly TicketPriority[];

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
