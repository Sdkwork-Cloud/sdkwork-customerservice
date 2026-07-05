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
  resolveCustomerServiceApiBaseUrl,
  resolveDriveApiBaseUrl,
} from "@sdkwork/customerservice-client-core";

import { getOperatorTokenManager } from "../session/operatorSession";
import { loadCustomerServiceIamSession } from "../session/iamOperatorSessionBridge";
import { getAppbaseAppSdkClient, resetAppbaseAppSdkClient } from "./appbaseAppSdkClient";

let backendSdkClient: SdkworkBackendClient | null = null;
let customerServiceAppSdkClient: SdkworkAppClient | null = null;
let driveAppSdkClient: ReturnType<typeof createDriveClient> | null = null;

function sharedClientConfig() {
  const session = loadCustomerServiceIamSession();
  return {
    tokenManager: getOperatorTokenManager(),
    authToken: session?.authToken,
    accessToken: session?.accessToken,
    tenantId: session?.context?.tenantId,
    organizationId: session?.context?.organizationId,
    platform: "pc" as const,
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

export function resetOperatorAuthenticatedSdkClients(): void {
  backendSdkClient = null;
  customerServiceAppSdkClient = null;
  driveAppSdkClient = null;
  resetAppbaseAppSdkClient();
}

export function getOperatorAuthenticatedSdkClients() {
  return [
    getAppbaseAppSdkClient(),
    getCustomerServiceBackendSdkClient(),
    getCustomerServiceAppSdkClient(),
    getDriveAppSdkClient(),
  ];
}
