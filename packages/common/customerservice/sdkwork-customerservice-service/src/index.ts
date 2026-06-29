import { isBlank } from "@sdkwork/utils";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type TicketSummary,
} from "@sdkwork/customerservice-contracts";

export function formatTicketHeadline(subject: string, ticketNo: string): string {
  const safeSubject = isBlank(subject) ? "Untitled ticket" : subject.trim();
  const safeNo = isBlank(ticketNo) ? "—" : ticketNo.trim();
  return `${safeNo} · ${safeSubject}`;
}

export function formatTicketStatus(status: string): string {
  if (isBlank(status)) {
    return "Unknown";
  }
  return TICKET_STATUS_LABELS[status.trim().toLowerCase()] ?? status;
}

export function formatTicketPriority(priority: string): string {
  if (isBlank(priority)) {
    return "Normal";
  }
  return TICKET_PRIORITY_LABELS[priority.trim().toLowerCase()] ?? priority;
}

export function formatTicketRow(ticket: TicketSummary): string {
  return `${formatTicketHeadline(ticket.subject, ticket.ticketNo)} · ${formatTicketStatus(ticket.status)} · ${formatTicketPriority(ticket.priority)}`;
}

export const DEMO_TICKETS: TicketSummary[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    ticketNo: "CS-DEMO001",
    subject: "Login issue on checkout",
    status: "open",
    priority: "high",
    channel: "web",
    requesterUserId: "00000000-0000-4000-8000-000000000010",
    assigneeUserId: null,
    createdAt: "2026-06-27T08:00:00.000Z",
    updatedAt: "2026-06-27T08:15:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    ticketNo: "CS-DEMO002",
    subject: "Refund request for order #88421",
    status: "pending",
    priority: "normal",
    channel: "email",
    requesterUserId: "00000000-0000-4000-8000-000000000011",
    assigneeUserId: "00000000-0000-4000-8000-000000000020",
    createdAt: "2026-06-27T07:30:00.000Z",
    updatedAt: "2026-06-27T09:00:00.000Z",
  },
];
