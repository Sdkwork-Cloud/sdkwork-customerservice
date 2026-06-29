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
import type { OperatorSession } from "@sdkwork/customerservice-pc-core";

const STATUS_OPTIONS = ["open", "pending", "resolved", "closed"] as const;
const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"] as const;

interface TicketWorkbenchPanelProps {
  session: OperatorSession | null;
  backendClient: SdkworkBackendClient;
  onSelectedTicketChange?: (ticketId: string) => void;
}

export function TicketWorkbenchPanel({
  session,
  backendClient,
  onSelectedTicketChange,
}: TicketWorkbenchPanelProps) {
  const hasSession = Boolean(session?.accessToken || session?.authToken);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [ticketDetail, setTicketDetail] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshTickets = useCallback(async () => {
    if (!hasSession) {
      setTickets([]);
      return;
    }
    setLoading(true);
    setStatusMessage(null);
    try {
      const items = await listOperatorTickets(backendClient, {
        status: statusFilter || undefined,
        pageSize: 50,
      });
      setTickets(items as TicketSummary[]);
      if (!selectedTicketId && items[0]?.id) {
        setSelectedTicketId(String(items[0].id));
        onSelectedTicketChange?.(String(items[0].id));
      }
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [backendClient, hasSession, onSelectedTicketChange, selectedTicketId, statusFilter]);

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
      setAssigneeUserId(detail?.assigneeUserId ?? "");
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

  const onSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    onSelectedTicketChange?.(ticketId);
  };

  const onUpdateTicket = async (patch: {
    status?: string;
    priority?: string;
    assigneeUserId?: string;
  }) => {
    if (!selectedTicketId) {
      return;
    }
    setStatusMessage("Updating ticket…");
    try {
      const updated = await updateOperatorTicket(backendClient, selectedTicketId, patch);
      if (updated) {
        setTicketDetail(updated);
        setAssigneeUserId(updated.assigneeUserId ?? "");
      }
      await refreshTickets();
      setStatusMessage("Ticket updated.");
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Ticket update failed");
    }
  };

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
    <section aria-labelledby="ticket-workbench-heading" style={{ marginTop: "1.5rem" }}>
      <h2 id="ticket-workbench-heading">Ticket workbench</h2>
      {!hasSession ? (
        <p style={{ color: "#57606a" }}>Save an operator session to manage tickets.</p>
      ) : null}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{formatTicketStatus(status)}</option>
          ))}
        </select>
        <button type="button" onClick={() => void refreshTickets()} disabled={!hasSession}>
          Refresh queue
        </button>
      </div>
      {loading ? <p>Loading tickets…</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(280px, 2fr)", gap: "1rem" }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              style={{
                border: selectedTicketId === ticket.id ? "2px solid #0969da" : "1px solid #d0d7de",
                borderRadius: "8px",
                padding: "0.75rem",
                marginBottom: "0.5rem",
                cursor: "pointer",
              }}
              onClick={() => onSelectTicket(ticket.id)}
            >
              <strong>{formatTicketHeadline(ticket.subject, ticket.ticketNo)}</strong>
              <div style={{ color: "#57606a", fontSize: "0.875rem" }}>
                {formatTicketStatus(ticket.status)} · {formatTicketPriority(ticket.priority)}
              </div>
            </li>
          ))}
        </ul>
        <div
          style={{
            border: "1px solid #d0d7de",
            borderRadius: "8px",
            padding: "1rem",
            minHeight: "280px",
          }}
        >
          {!ticketDetail ? (
            <p style={{ color: "#57606a" }}>Select a ticket to view details and reply.</p>
          ) : (
            <>
              <h3 style={{ marginTop: 0 }}>{formatTicketHeadline(ticketDetail.subject, ticketDetail.ticketNo)}</h3>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                <select
                  value={ticketDetail.status}
                  onChange={(event) => void onUpdateTicket({ status: event.target.value })}
                  aria-label="Ticket status"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{formatTicketStatus(status)}</option>
                  ))}
                </select>
                <select
                  value={ticketDetail.priority}
                  onChange={(event) => void onUpdateTicket({ priority: event.target.value })}
                  aria-label="Ticket priority"
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>{formatTicketPriority(priority)}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Assignee user id"
                  value={assigneeUserId}
                  onChange={(event) => setAssigneeUserId(event.target.value)}
                  style={{ minWidth: "12rem" }}
                />
                <button
                  type="button"
                  onClick={() =>
                    void onUpdateTicket({
                      assigneeUserId: assigneeUserId.trim() || undefined,
                    })
                  }
                >
                  Save assignee
                </button>
              </div>
              <div aria-label="Message thread" style={{ marginBottom: "0.75rem" }}>
                {messages.length === 0 ? (
                  <p style={{ color: "#57606a" }}>No messages yet.</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {messages.map((message) => (
                      <li
                        key={message.id}
                        style={{
                          borderBottom: "1px solid #eaeef2",
                          padding: "0.5rem 0",
                        }}
                      >
                        <div style={{ fontSize: "0.8rem", color: "#57606a" }}>
                          {message.authorRole} · {message.createdAt}
                        </div>
                        <div>{message.body}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <textarea
                rows={3}
                placeholder="Agent reply"
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                style={{ width: "100%", marginBottom: "0.5rem" }}
              />
              <button type="button" onClick={() => void onSendReply()} disabled={!replyBody.trim()}>
                Send reply
              </button>
            </>
          )}
        </div>
      </div>
      {statusMessage ? <p style={{ color: "#57606a", marginTop: "0.75rem" }}>{statusMessage}</p> : null}
    </section>
  );
}
