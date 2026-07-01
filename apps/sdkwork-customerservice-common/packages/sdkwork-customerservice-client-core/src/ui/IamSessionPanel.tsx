import { useMemo, useState } from "react";
import { isBlank } from "@sdkwork/utils";
import type { OperatorSession } from "../session/operatorSdkHeaders";
import {
  loadOperatorSessionFromStorage,
  saveOperatorSessionToStorage,
} from "../session/operatorSessionStorage";

export interface IamSessionPanelProps {
  storageKey: string;
  title: string;
  description: string;
  className?: string;
  onSessionChange?: (session: OperatorSession | null) => void;
}

export function IamSessionPanel({
  storageKey,
  title,
  description,
  className,
  onSessionChange,
}: IamSessionPanelProps) {
  const existing = useMemo(() => loadOperatorSessionFromStorage(storageKey), [storageKey]);
  const [accessToken, setAccessToken] = useState(existing?.accessToken ?? "");
  const [authToken, setAuthToken] = useState(existing?.authToken ?? "");
  const [tenantId, setTenantId] = useState(existing?.tenantId ?? "");
  const [organizationId, setOrganizationId] = useState(existing?.organizationId ?? "");
  const [userId, setUserId] = useState(existing?.userId ?? "");
  const [message, setMessage] = useState<string | null>(null);

  function applySession(session: OperatorSession | null) {
    saveOperatorSessionToStorage(storageKey, session);
    onSessionChange?.(session);
  }

  return (
    <section className={className ?? "iam-session-panel"} aria-labelledby={`${storageKey}-heading`}>
      <h2 id={`${storageKey}-heading`}>{title}</h2>
      <p className="hint">{description}</p>
      <div className="iam-session-fields">
        <label>
          Access token
          <input
            type="password"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
          />
        </label>
        <label>
          Auth token
          <input
            type="password"
            value={authToken}
            onChange={(event) => setAuthToken(event.target.value)}
          />
        </label>
        <label>
          Tenant ID
          <input value={tenantId} onChange={(event) => setTenantId(event.target.value)} />
        </label>
        <label>
          Organization ID
          <input
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
          />
        </label>
        <label>
          User ID
          <input value={userId} onChange={(event) => setUserId(event.target.value)} />
        </label>
      </div>
      <div className="iam-session-actions">
        <button
          type="button"
          onClick={() => {
            if (isBlank(accessToken) && isBlank(authToken)) {
              setMessage("Access token or auth token is required.");
              return;
            }
            applySession({
              ...(accessToken.trim() ? { accessToken: accessToken.trim() } : {}),
              ...(authToken.trim() ? { authToken: authToken.trim() } : {}),
              ...(tenantId.trim() ? { tenantId: tenantId.trim() } : {}),
              ...(organizationId.trim() ? { organizationId: organizationId.trim() } : {}),
              ...(userId.trim() ? { userId: userId.trim() } : {}),
            });
            setMessage("Session saved to sessionStorage.");
          }}
        >
          Save session
        </button>
        <button
          type="button"
          onClick={() => {
            applySession(null);
            setAccessToken("");
            setAuthToken("");
            setTenantId("");
            setOrganizationId("");
            setUserId("");
            setMessage("Session cleared.");
          }}
        >
          Clear
        </button>
      </div>
      {message ? <p className="hint">{message}</p> : null}
    </section>
  );
}
