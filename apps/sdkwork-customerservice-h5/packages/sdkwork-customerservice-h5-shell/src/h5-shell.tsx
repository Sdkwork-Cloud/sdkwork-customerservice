import { useMemo, useState } from "react";
import type { SdkworkBackendClient } from "sdkwork-customerservice-backend-sdk-generated-typescript";
import {
  createCustomerServiceAppClient,
  createCustomerServiceBackendClient,
  loadEndUserSession,
  loadOperatorSession,
  toOperatorSession,
  type EndUserSession,
} from "@sdkwork/customerservice-h5-core";
import { H5ChannelAdminPanel } from "./h5-channel-admin-panel";
import { H5EndUserPanel } from "./h5-end-user-panel";
import { H5PluginAdminPanel } from "./h5-plugin-admin-panel";
import { H5TicketWorkbenchPanel } from "./h5-ticket-workbench-panel";
import { H5ManualSessionPanel } from "./h5-manual-session-panel";

export function CustomerServiceH5Shell() {
  const [mode, setMode] = useState<"end-user" | "operator">("end-user");
  const [operatorTab, setOperatorTab] = useState<"tickets" | "channels" | "plugins">("tickets");
  const [sessionVersion, setSessionVersion] = useState(0);

  const endUserSession = useMemo(
    () => loadEndUserSession(),
    [sessionVersion],
  );
  const operatorSession = useMemo(
    () => loadOperatorSession(),
    [sessionVersion],
  );

  const appClient = useMemo(
    () => createCustomerServiceAppClient({ session: endUserSession }),
    [endUserSession],
  );
  const backendClient = useMemo(
    () => createCustomerServiceBackendClient({ session: operatorSession }),
    [operatorSession],
  );

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
      <H5ManualSessionPanel onSessionChange={() => setSessionVersion((value) => value + 1)} />
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
            <button
              type="button"
              aria-pressed={operatorTab === "plugins"}
              onClick={() => setOperatorTab("plugins")}
            >
              Plugins
            </button>
          </div>
          {operatorTab === "tickets" ? (
            <H5TicketWorkbenchPanel session={operatorSession} backendClient={backendClient} />
          ) : null}
          {operatorTab === "channels" ? (
            <H5ChannelAdminPanel session={operatorSession} backendClient={backendClient} />
          ) : null}
          {operatorTab === "plugins" ? (
            <H5PluginAdminPanel session={operatorSession} backendClient={backendClient} />
          ) : null}
        </>
      ) : (
        <H5EndUserPanel
          session={endUserSession}
          appClient={appClient}
          onSessionChange={() => setSessionVersion((value) => value + 1)}
        />
      )}
    </main>
  );
}
