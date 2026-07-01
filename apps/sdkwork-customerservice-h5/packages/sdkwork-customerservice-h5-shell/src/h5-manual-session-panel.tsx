import {
  IamSessionPanel,
  readSdkBaseUrlEnvValue,
  type OperatorSession,
} from "@sdkwork/customerservice-client-core";
import { END_USER_SESSION_STORAGE_KEY, saveEndUserSession } from "@sdkwork/customerservice-h5-core";

function isManualSessionPanelEnabled(): boolean {
  const explicit = readSdkBaseUrlEnvValue("VITE_SDKWORK_CUSTOMER_SERVICE_DEV_MANUAL_SESSION");
  return explicit === "true" || explicit === "1";
}

export function H5ManualSessionPanel(props: { onSessionChange?: () => void }) {
  if (!isManualSessionPanelEnabled()) {
    return null;
  }

  return (
    <IamSessionPanel
      storageKey={END_USER_SESSION_STORAGE_KEY}
      title="Manual session override (development)"
      description="Paste IAM tokens only when platform login is unavailable. Prefer /auth/login."
      onSessionChange={(session: OperatorSession | null) => {
        saveEndUserSession(session);
        props.onSessionChange?.();
      }}
    />
  );
}
