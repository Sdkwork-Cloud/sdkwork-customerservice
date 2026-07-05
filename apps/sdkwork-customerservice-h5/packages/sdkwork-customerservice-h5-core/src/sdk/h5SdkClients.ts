import { attachSdkworkSdkSessionAuthBoundary } from "@sdkwork/auth-runtime-pc-react";
import { createClient as createDriveClient } from "@sdkwork/drive-app-sdk";
import {
  createClient as createAppClient,
  type SdkworkAppClient,
} from "@sdkwork/customerservice-app-sdk";
import {
  createClient as createBackendClient,
  type SdkworkBackendClient,
} from "@sdkwork/customerservice-backend-sdk";
import {
  buildOperatorSdkHeaders,
  resolveCustomerServiceApiBaseUrl,
  resolveDriveApiBaseUrl,
  toOperatorSession,
} from "@sdkwork/customerservice-client-core";

import {
  getH5GlobalTokenManager,
  loadCustomerServiceH5IamSession,
} from "../session/iamSession";
import { getAppbaseAppSdkClient, resetAppbaseAppSdkClient } from "./appbaseAppSdkClient";

let backendSdkClient: SdkworkBackendClient | null = null;
let customerServiceAppSdkClient: SdkworkAppClient | null = null;
let driveAppSdkClient: ReturnType<typeof createDriveClient> | null = null;

function sharedClientConfig() {
  const session = toOperatorSession(loadCustomerServiceH5IamSession());
  return {
    tokenManager: getH5GlobalTokenManager(),
    authToken: session?.authToken,
    accessToken: session?.accessToken,
    tenantId: session?.tenantId,
    organizationId: session?.organizationId,
    headers: session ? buildOperatorSdkHeaders(session) : undefined,
    platform: "h5" as const,
  };
}

export function getCustomerServiceBackendSdkClient(): SdkworkBackendClient {
  if (!backendSdkClient) {
    backendSdkClient = attachSdkworkSdkSessionAuthBoundary(
      createBackendClient({
        ...sharedClientConfig(),
        baseUrl: resolveCustomerServiceApiBaseUrl(),
      }),
    );
  }
  return backendSdkClient;
}

export function getCustomerServiceAppSdkClient(): SdkworkAppClient {
  if (!customerServiceAppSdkClient) {
    customerServiceAppSdkClient = attachSdkworkSdkSessionAuthBoundary(
      createAppClient({
        ...sharedClientConfig(),
        baseUrl: resolveCustomerServiceApiBaseUrl(),
      }),
    );
  }
  return customerServiceAppSdkClient;
}

export function getDriveAppSdkClient(): ReturnType<typeof createDriveClient> {
  if (!driveAppSdkClient) {
    driveAppSdkClient = attachSdkworkSdkSessionAuthBoundary(
      createDriveClient({
        ...sharedClientConfig(),
        baseUrl: resolveDriveApiBaseUrl(),
      }),
    );
  }
  return driveAppSdkClient;
}

export function resetH5AuthenticatedSdkClients(): void {
  backendSdkClient = null;
  customerServiceAppSdkClient = null;
  driveAppSdkClient = null;
  resetAppbaseAppSdkClient();
}

export function getH5AuthenticatedSdkClients() {
  return [
    getAppbaseAppSdkClient(),
    getCustomerServiceBackendSdkClient(),
    getCustomerServiceAppSdkClient(),
    getDriveAppSdkClient(),
  ];
}
