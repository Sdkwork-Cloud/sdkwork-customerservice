import { useCallback, useEffect, useState } from "react";
import type { TicketDetail, TicketMessage, TicketSummary } from "@sdkwork/customerservice-contracts";
import {
  formatTicketHeadline,
  formatTicketPriority,
  formatTicketStatus,
} from "@sdkwork/customerservice-service";
import {
  listOperatorTicketMessages,
  listOperatorTickets,
  retrieveOperatorTicket,
  sendOperatorTicketMessage,
  updateOperatorTicket,
} from "@sdkwork/customerservice-client-core";
import type { SdkworkBackendClient } from "sdkwork-customerservice-backend-sdk-generated-typescript";
import type { OperatorSession } from "@sdkwork/customerservice-h5-core";

const STATUS_OPTIONS = ["open", "pending", "resolved", "closed"] as const;
const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"] as const;

interface H5TicketWorkbenchPanelProps {
  session: OperatorSession | null;
  backendClient: SdkworkBackendClient;
}

export function H5TicketWorkbenchPanel({ session, backendClient }: H5TicketWorkbenchPanelProps) {
  const hasSession = Boolean(session?.accessToken || session?.authToken);
  const [statusFilter, setStatusFilter] = useState("");
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [ticketDetail, setTicketDetail] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshTickets = useCallback(async () => {
    if (!hasSession) {
      setTickets([]);
      return;
    }
    try {
      const items = await listOperatorTickets(backendClient, {
        status: statusFilter || undefined,
        pageSize: 50,
      });
      setTickets(items as TicketSummary[]);
      if (!selectedTicketId && items[0]?.id) {
        setSelectedTicketId(String(items[0].id));
      }
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Failed to load tickets");
    }
  }, [backendClient, hasSession, selectedTicketId, statusFilter]);

  const refreshDetail = useCallback(async () => {
    if (!hasSession || !selectedTicketId) {
      setTicketDetail(null);
      setMessages([]);
      return;
    }
    try {
      const detail = await retrieveOperatorTicket(backendClient, selectedTicketId);
      const messageItems = await listOperatorTicketMessages(backendClient, selectedTicketId);
      setTicketDetail(detail ?? null);
      setMessages(messageItems);
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Failed to load ticket detail");
    }
  }, [backendClient, hasSession, selectedTicketId]);

  useEffect(() => {
    void refreshTickets();
  }, [refreshTickets]);

  useEffect(() => {
    void refreshDetail();
  }, [refreshDetail]);

  const onSendReply = async () => {
    if (!selectedTicketId || !replyBody.trim()) {
      return;
    }
    setStatusMessage("Sending reply…");
    try {
      await sendOperatorTicketMessage(backendClient, selectedTicketId, replyBody.trim());
      setReplyBody("");
      await refreshDetail();
      setStatusMessage("Reply sent.");
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Reply failed");
    }
  };

  return (
    <section className="h5-panel" aria-labelledby="h5-ticket-workbench-heading">
      <h2 id="h5-ticket-workbench-heading">Ticket workbench</h2>
      {!hasSession ? <p className="hint">Save an operator session to manage tickets.</p> : null}
      <div className="h5-actions">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {formatTicketStatus(status)}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => void refreshTickets()} disabled={!hasSession}>
          Refresh
        </button>
      </div>
      <ul className="h5-list">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <button
              type="button"
              className={selectedTicketId === ticket.id ? "h5-list-item active" : "h5-list-item"}
              onClick={() => setSelectedTicketId(ticket.id)}
            >
              <strong>{formatTicketHeadline(ticket.subject, ticket.ticketNo)}</strong>
              <span>
                {formatTicketStatus(ticket.status)} · {formatTicketPriority(ticket.priority)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {ticketDetail ? (
        <div className="h5-detail">
          <h3>{formatTicketHeadline(ticketDetail.subject, ticketDetail.ticketNo)}</h3>
          <div className="h5-actions">
            <select
              value={ticketDetail.status}
              onChange={(event) =>
                void updateOperatorTicket(backendClient, selectedTicketId, {
                  status: event.target.value,
                }).then(() => refreshDetail())
              }
              aria-label="Ticket status"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatTicketStatus(status)}
                </option>
              ))}
            </select>
            <select
              value={ticketDetail.priority}
              onChange={(event) =>
                void updateOperatorTicket(backendClient, selectedTicketId, {
                  priority: event.target.value,
                }).then(() => refreshDetail())
              }
              aria-label="Ticket priority"
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {formatTicketPriority(priority)}
                </option>
              ))}
            </select>
          </div>
          <ul className="h5-messages">
            {messages.map((message) => (
              <li key={message.id}>
                <div className="h5-message-meta">
                  {message.authorRole} · {message.createdAt}
                </div>
                <div>{message.body}</div>
              </li>
            ))}
          </ul>
          <textarea
            rows={3}
            placeholder="Agent reply"
            value={replyBody}
            onChange={(event) => setReplyBody(event.target.value)}
          />
          <button type="button" onClick={() => void onSendReply()} disabled={!replyBody.trim()}>
            Send reply
          </button>
        </div>
      ) : (
        <p className="hint">Select a ticket to view details and reply.</p>
      )}
      {statusMessage ? <p className="hint">{statusMessage}</p> : null}
    </section>
  );
}
