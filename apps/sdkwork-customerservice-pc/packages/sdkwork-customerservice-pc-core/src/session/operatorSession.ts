import { createTokenManager, type AuthTokenManager } from "@sdkwork/sdk-common";
import {
  buildOperatorSdkHeaders,
  loadOperatorSessionFromStorage,
  readOperatorSessionFromEnv,
  saveOperatorSessionToStorage,
  type OperatorSession,
} from "@sdkwork/customerservice-client-core";

import {
  loadCustomerServiceIamSession,
  toOperatorSession,
} from "./iamOperatorSessionBridge";

export type { OperatorSession };

export const OPERATOR_SESSION_STORAGE_KEY = "sdkwork-customerservice-pc:session:v1";
export const OPERATOR_SESSION_CHANGED_EVENT = "sdkwork-customerservice-pc:session-changed";

let globalTokenManager: AuthTokenManager | null = null;

export function loadOperatorSession(): OperatorSession | null {
  const iamSession = toOperatorSession(loadCustomerServiceIamSession());
  if (iamSession) {
    return iamSession;
  }
  return loadOperatorSessionFromStorage(OPERATOR_SESSION_STORAGE_KEY);
}

export function saveOperatorSession(session: OperatorSession | null): void {
  saveOperatorSessionToStorage(OPERATOR_SESSION_STORAGE_KEY, session);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(OPERATOR_SESSION_CHANGED_EVENT, { detail: { session } }),
    );
  }
}

export function getOperatorTokenManager(): AuthTokenManager {
  if (!globalTokenManager) {
    globalTokenManager = createTokenManager();
  }
  const session = loadOperatorSession();
  if (session?.accessToken || session?.authToken) {
    globalTokenManager.setTokens({
      ...(session.accessToken ? { accessToken: session.accessToken } : {}),
      ...(session.authToken ? { authToken: session.authToken } : {}),
    });
  }
  return globalTokenManager;
}

export { buildOperatorSdkHeaders, readOperatorSessionFromEnv };
