import { useCallback, useEffect, useMemo, useState } from "react";
import type { TicketDetail, TicketMessage, TicketSummary } from "@sdkwork/customerservice-contracts";
import {
  createMyTicket,
  formatSdkError,
  listMyTicketAttachments,
  listMyTicketMessages,
  listMyTickets,
  registerMyTicketAttachment,
  retrieveMyTicket,
  sendMyTicketMessage,
} from "@sdkwork/customerservice-client-core";
import { formatTicketHeadline, formatTicketRow } from "@sdkwork/customerservice-service";
import type { SdkworkAppClient } from "sdkwork-customerservice-app-sdk-generated-typescript";
import {
  createEndUserDriveAttachmentUploadPort,
  type EndUserSession,
} from "@sdkwork/customerservice-h5-core";

interface H5EndUserPanelProps {
  session: EndUserSession | null;
  appClient: SdkworkAppClient;
  onSessionChange?: () => void;
}

export function H5EndUserPanel({ session, appClient }: H5EndUserPanelProps) {
  const hasSession = Boolean(session?.accessToken || session?.authToken);
  const driveUploadPort = useMemo(
    () => createEndUserDriveAttachmentUploadPort(session),
    [session],
  );
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [attachments, setAttachments] = useState<Array<{ fileName?: string; driveNodeId?: string }>>(
    [],
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshTickets = useCallback(async () => {
    if (!hasSession) {
      setTickets([]);
      return;
    }
    setLoading(true);
    try {
      const items = await listMyTickets(appClient, { pageSize: 50 });
      setTickets(items);
      if (!selectedTicketId && items[0]?.id) {
        setSelectedTicketId(String(items[0].id));
      }
      setStatusMessage(null);
    } catch (cause: unknown) {
      setStatusMessage(formatSdkError(cause));
    } finally {
      setLoading(false);
    }
  }, [appClient, hasSession, selectedTicketId]);

  const refreshDetail = useCallback(async () => {
    if (!hasSession || !selectedTicketId) {
      setDetail(null);
      setMessages([]);
      setAttachments([]);
      return;
    }
    try {
      const [ticket, messageItems, attachmentItems] = await Promise.all([
        retrieveMyTicket(appClient, selectedTicketId),
        listMyTicketMessages(appClient, selectedTicketId),
        listMyTicketAttachments(appClient, selectedTicketId),
      ]);
      setDetail(ticket);
      setMessages(messageItems);
      setAttachments(attachmentItems);
    } catch (cause: unknown) {
      setStatusMessage(formatSdkError(cause));
    }
  }, [appClient, hasSession, selectedTicketId]);

  useEffect(() => {
    void refreshTickets();
  }, [refreshTickets]);

  useEffect(() => {
    void refreshDetail();
  }, [refreshDetail]);

  const onCreateTicket = async () => {
    if (!subject.trim() || !body.trim()) {
      setStatusMessage("Subject and message are required.");
      return;
    }
    try {
      const created = await createMyTicket(appClient, {
        subject: subject.trim(),
        body: body.trim(),
      });
      setSubject("");
      setBody("");
      setSelectedTicketId(String(created.id));
      await refreshTickets();
      setStatusMessage("Ticket created.");
    } catch (cause: unknown) {
      setStatusMessage(formatSdkError(cause));
    }
  };

  const onSendReply = async () => {
    if (!selectedTicketId || !replyBody.trim()) {
      return;
    }
    try {
      await sendMyTicketMessage(appClient, selectedTicketId, replyBody.trim());
      setReplyBody("");
      await refreshDetail();
      setStatusMessage("Message sent.");
    } catch (cause: unknown) {
      setStatusMessage(formatSdkError(cause));
    }
  };

  const onAttachmentSelected = async (file: File) => {
    if (!selectedTicketId) {
      setStatusMessage("Select a ticket before uploading an attachment.");
      return;
    }
    if (!hasSession) {
      setStatusMessage("Save a session before uploading attachments.");
      return;
    }
    setStatusMessage(`Uploading ${file.name} through sdkwork-drive…`);
    try {
      const uploaded = await driveUploadPort.uploadTicketAttachment(file);
      await registerMyTicketAttachment(appClient, selectedTicketId, {
        driveNodeId: uploaded.driveNodeId,
        fileName: uploaded.fileName,
        contentType: uploaded.contentType,
        sizeBytes: String(uploaded.sizeBytes),
      });
      await refreshDetail();
      setStatusMessage(`Registered attachment ${uploaded.fileName}.`);
    } catch (cause: unknown) {
      setStatusMessage(formatSdkError(cause));
    }
  };

  return (
    <>
      {statusMessage ? <p className="error">{statusMessage}</p> : null}
      {loading ? <p className="hint">Loading…</p> : null}
      <section className="h5-create-ticket">
        <h2>Create ticket</h2>
        <input
          value={subject}
          placeholder="Subject"
          onChange={(event) => setSubject(event.target.value)}
          disabled={!hasSession}
        />
        <textarea
          rows={3}
          value={body}
          placeholder="Describe your issue"
          onChange={(event) => setBody(event.target.value)}
          disabled={!hasSession}
        />
        <button type="button" disabled={!hasSession} onClick={() => void onCreateTicket()}>
          Submit ticket
        </button>
      </section>
      <section className="h5-ticket-list">
        <h2>My tickets</h2>
        <ul>
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <button
                type="button"
                className={selectedTicketId === String(ticket.id) ? "active" : undefined}
                onClick={() => setSelectedTicketId(String(ticket.id))}
              >
                {formatTicketRow(ticket)}
              </button>
            </li>
          ))}
        </ul>
        {!hasSession ? (
          <p className="hint">Save a session to load tickets.</p>
        ) : null}
        {hasSession && tickets.length === 0 && !loading ? (
          <p className="hint">No tickets yet.</p>
        ) : null}
      </section>
      {detail ? (
        <section className="h5-ticket-detail">
          <h2>{formatTicketHeadline(detail.subject, detail.ticketNo)}</h2>
          <ul>
            {messages.map((message) => (
              <li key={message.id}>
                <strong>{message.authorRole}</strong>: {message.body}
              </li>
            ))}
          </ul>
          <textarea
            rows={2}
            value={replyBody}
            placeholder="Reply"
            onChange={(event) => setReplyBody(event.target.value)}
          />
          <button type="button" onClick={() => void onSendReply()}>
            Send reply
          </button>
          <label className="h5-attachment-upload">
            Upload attachment
            <input
              type="file"
              disabled={!hasSession || !selectedTicketId}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void onAttachmentSelected(file);
                }
                event.currentTarget.value = "";
              }}
            />
          </label>
          {attachments.length > 0 ? (
            <>
              <h3>Attachments</h3>
              <ul>
                {attachments.map((item) => (
                  <li key={String(item.driveNodeId ?? item.fileName)}>
                    {item.fileName ?? item.driveNodeId}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
