import {
  createClient,
  type SdkworkBackendClient,
} from "@sdkwork/customerservice-backend-sdk";
import type { AuthTokenManager } from "@sdkwork/sdk-common";

import { resolveCustomerServiceApiBaseUrl } from "../config/resolveApiBaseUrl";
import {
  buildOperatorSdkHeaders,
  type OperatorSession,
} from "../session/operatorSession";

export interface CreateBackendSdkClientOptions {
  apiBaseUrl?: string;
  session: OperatorSession | null;
  tokenManager?: AuthTokenManager;
}

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
    platform: "pc",
  });
  if (session?.authToken) {
    client.setAuthToken(session.authToken);
  }
  if (session?.accessToken) {
    client.setAccessToken(session.accessToken);
  }
  return client;
}
