import { useMemo, useState } from "react";
import { isBlank } from "@sdkwork/utils";
import {
  loadOperatorSession,
  saveOperatorSession,
  type OperatorSession,
} from "@sdkwork/customerservice-pc-core";

export function OperatorSessionPanel(props: { onSessionChange?: (session: OperatorSession | null) => void }) {
  const existing = useMemo(() => loadOperatorSession(), []);
  const [accessToken, setAccessToken] = useState(existing?.accessToken ?? "");
  const [authToken, setAuthToken] = useState(existing?.authToken ?? "");
  const [tenantId, setTenantId] = useState(existing?.tenantId ?? "");
  const [organizationId, setOrganizationId] = useState(existing?.organizationId ?? "");
  const [userId, setUserId] = useState(existing?.userId ?? "");
  const [message, setMessage] = useState<string | null>(null);

  function applySession(session: OperatorSession | null) {
    saveOperatorSession(session);
    props.onSessionChange?.(session);
  }

  return (
    <section
      aria-labelledby="operator-session-heading"
      style={{
        border: "1px solid #d0d7de",
        borderRadius: "8px",
        padding: "1rem",
        marginBottom: "1.5rem",
      }}
    >
      <h2 id="operator-session-heading">Operator session</h2>
      <p style={{ color: "#57606a", marginTop: 0 }}>
        Paste IAM tokens for live backend and Drive APIs. Values are stored in localStorage only.
      </p>
      <div style={{ display: "grid", gap: "0.75rem", maxWidth: "640px" }}>
        <label>
          Access token
          <input
            type="password"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          Auth token
          <input
            type="password"
            value={authToken}
            onChange={(event) => setAuthToken(event.target.value)}
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          Tenant ID
          <input
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          Organization ID
          <input
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          User ID
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
          />
        </label>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        <button
          type="button"
          onClick={() => {
            if (isBlank(accessToken) && isBlank(authToken)) {
              setMessage("Provide at least one token.");
              return;
            }
            const session: OperatorSession = {
              ...(isBlank(accessToken) ? {} : { accessToken: accessToken.trim() }),
              ...(isBlank(authToken) ? {} : { authToken: authToken.trim() }),
              ...(isBlank(tenantId) ? {} : { tenantId: tenantId.trim() }),
              ...(isBlank(organizationId) ? {} : { organizationId: organizationId.trim() }),
              ...(isBlank(userId) ? {} : { userId: userId.trim() }),
            };
            applySession(session);
            setMessage("Session saved. Reload ticket queue to use live APIs.");
          }}
        >
          Save session
        </button>
        <button
          type="button"
          onClick={() => {
            setAccessToken("");
            setAuthToken("");
            setTenantId("");
            setOrganizationId("");
            setUserId("");
            applySession(null);
            setMessage("Session cleared.");
          }}
        >
          Clear
        </button>
      </div>
      {message ? <p style={{ color: "#57606a", marginBottom: 0 }}>{message}</p> : null}
    </section>
  );
}
