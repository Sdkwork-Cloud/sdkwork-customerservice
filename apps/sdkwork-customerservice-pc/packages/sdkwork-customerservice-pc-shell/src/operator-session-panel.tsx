import {
  IamSessionPanel as SharedIamSessionPanel,
  readSdkBaseUrlEnvValue,
  type OperatorSession,
} from "@sdkwork/customerservice-client-core";
import {
  OPERATOR_SESSION_STORAGE_KEY,
  saveOperatorSession,
} from "@sdkwork/customerservice-pc-core";

function isManualSessionPanelEnabled(): boolean {
  const explicit = readSdkBaseUrlEnvValue("VITE_SDKWORK_CUSTOMER_SERVICE_DEV_MANUAL_SESSION");
  return explicit === "true" || explicit === "1";
}

export function OperatorSessionPanel(props: {
  onSessionChange?: (session: OperatorSession | null) => void;
}) {
  if (!isManualSessionPanelEnabled()) {
    return null;
  }

  return (
    <SharedIamSessionPanel
      storageKey={OPERATOR_SESSION_STORAGE_KEY}
      title="Manual operator session (development)"
      description="Paste IAM tokens when platform login is unavailable. Prefer /auth/login for standard IAM sign-in."
      onSessionChange={(session) => {
        saveOperatorSession(session);
        props.onSessionChange?.(session);
      }}
    />
  );
}
