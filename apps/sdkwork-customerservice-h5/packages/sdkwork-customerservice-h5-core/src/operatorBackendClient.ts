import {
  createClient,
  type SdkworkBackendClient,
} from "sdkwork-customerservice-backend-sdk-generated-typescript";
import type { AuthTokenManager } from "@sdkwork/sdk-common";
import {
  buildOperatorSdkHeaders,
  loadOperatorSessionFromStorage,
  saveOperatorSessionToStorage,
  toOperatorSession,
  type OperatorSession,
} from "@sdkwork/customerservice-client-core";

import { loadCustomerServiceH5IamSession } from "./session/iamSession";
import { resolveCustomerServiceApiBaseUrl } from "@sdkwork/customerservice-client-core";

export type { OperatorSession };

export const OPERATOR_SESSION_STORAGE_KEY = "sdkwork.customerservice.h5.operator.session";

export interface CreateBackendSdkClientOptions {
  apiBaseUrl?: string;
  session: OperatorSession | null;
  tokenManager?: AuthTokenManager;
}

export function loadOperatorSession(): OperatorSession | null {
  return (
    toOperatorSession(loadCustomerServiceH5IamSession()) ??
    loadOperatorSessionFromStorage(OPERATOR_SESSION_STORAGE_KEY)
  );
}

export function saveOperatorSession(session: OperatorSession | null): void {
  saveOperatorSessionToStorage(OPERATOR_SESSION_STORAGE_KEY, session);
}

export { buildOperatorSdkHeaders };

export function createCustomerServiceBackendClient({
  apiBaseUrl,
  session,
  tokenManager,
}: CreateBackendSdkClientOptions): SdkworkBackendClient {
  const client = createClient({
    baseUrl: resolveCustomerServiceApiBaseUrl(apiBaseUrl),
    tokenManager,
    authToken: session?.authToken,
    accessToken: session?.accessToken,
    tenantId: session?.tenantId,
    organizationId: session?.organizationId,
    headers: session ? buildOperatorSdkHeaders(session) : undefined,
    platform: "h5",
  });
  if (session?.authToken) {
    client.setAuthToken(session.authToken);
  }
  if (session?.accessToken) {
    client.setAccessToken(session.accessToken);
  }
  return client;
}
