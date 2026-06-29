import { useEffect, useMemo, useState } from "react";
import type { TicketSummary } from "@sdkwork/customerservice-contracts";
import { DEMO_TICKETS, formatTicketRow } from "@sdkwork/customerservice-service";
import {
  createCustomerServiceAppClient,
  createCustomerServiceBackendClient,
  listMyTickets,
  loadOperatorSession,
  type EndUserSession,
} from "@sdkwork/customerservice-h5-core";
import { H5ChannelAdminPanel } from "./h5-channel-admin-panel";
import { H5TicketWorkbenchPanel } from "./h5-ticket-workbench-panel";

function loadEndUserSession(): EndUserSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem("sdkwork.customerservice.h5.session");
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as EndUserSession;
  } catch {
    return null;
  }
}

export function CustomerServiceH5Shell() {
  const [mode, setMode] = useState<"end-user" | "operator">("end-user");
  const [operatorTab, setOperatorTab] = useState<"tickets" | "channels">("tickets");
  const [session] = useState<EndUserSession | null>(() => loadEndUserSession());
  const [operatorSession] = useState(() => loadOperatorSession());
  const client = useMemo(() => createCustomerServiceAppClient({ session }), [session]);
  const backendClient = useMemo(
    () => createCustomerServiceBackendClient({ session: operatorSession }),
    [operatorSession],
  );
  const [tickets, setTickets] = useState<TicketSummary[]>(DEMO_TICKETS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "end-user" || (!session?.accessToken && !session?.authToken)) {
      if (mode === "end-user" && !session?.accessToken && !session?.authToken) {
        setTickets(DEMO_TICKETS);
      }
      return;
    }
    listMyTickets(client)
      .then((items) => setTickets(items.length > 0 ? (items as TicketSummary[]) : []))
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Failed to load tickets");
      });
  }, [client, session, mode]);

  return (
    <main className="h5-shell">
      <header>
        <h1>Customer Service</h1>
        <p>Mobile H5 — end-user inbox and operator ticket/channel controls</p>
        <div className="h5-actions">
          <button type="button" aria-pressed={mode === "end-user"} onClick={() => setMode("end-user")}>
            End user
          </button>
          <button type="button" aria-pressed={mode === "operator"} onClick={() => setMode("operator")}>
            Operator
          </button>
        </div>
      </header>
      {mode === "operator" ? (
        <>
          <div className="h5-actions">
            <button
              type="button"
              aria-pressed={operatorTab === "tickets"}
              onClick={() => setOperatorTab("tickets")}
            >
              Tickets
            </button>
            <button
              type="button"
              aria-pressed={operatorTab === "channels"}
              onClick={() => setOperatorTab("channels")}
            >
              Channels
            </button>
          </div>
          {operatorTab === "tickets" ? (
            <H5TicketWorkbenchPanel session={operatorSession} backendClient={backendClient} />
          ) : (
            <H5ChannelAdminPanel session={operatorSession} backendClient={backendClient} />
          )}
        </>
      ) : (
        <>
          {error ? <p className="error">{error}</p> : null}
          <ul>
            {tickets.map((ticket: TicketSummary) => (
              <li key={ticket.id}>{formatTicketRow(ticket)}</li>
            ))}
          </ul>
          {!session ? (
            <p className="hint">Sign in via IAM to load live tickets (demo data shown).</p>
          ) : null}
        </>
      )}
    </main>
  );
}
