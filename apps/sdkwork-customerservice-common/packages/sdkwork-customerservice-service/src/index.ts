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
