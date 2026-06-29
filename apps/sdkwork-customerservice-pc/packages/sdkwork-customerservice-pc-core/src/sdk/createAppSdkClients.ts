import {
  createClient,
  type SdkworkAppClient,
} from "sdkwork-customerservice-app-sdk-generated-typescript";
import { createClient as createDriveClient } from "@sdkwork/drive-app-sdk";
import type { AuthTokenManager } from "@sdkwork/sdk-common";

import { resolveCustomerServiceApiBaseUrl, resolveDriveApiBaseUrl } from "../config/resolveApiBaseUrl";
import {
  buildOperatorSdkHeaders,
  type OperatorSession,
} from "../session/operatorSession";

export interface CreateAppSdkClientsOptions {
  customerServiceBaseUrl?: string;
  driveBaseUrl?: string;
  session: OperatorSession | null;
  tokenManager?: AuthTokenManager;
}

export interface CustomerServiceAppSdkClients {
  customerService: SdkworkAppClient;
  drive: ReturnType<typeof createDriveClient>;
}

export function createCustomerServiceAppSdkClients({
  customerServiceBaseUrl,
  driveBaseUrl,
  session,
  tokenManager,
}: CreateAppSdkClientsOptions): CustomerServiceAppSdkClients {
  const shared = {
    tokenManager,
    authToken: session?.authToken,
    accessToken: session?.accessToken,
    tenantId: session?.tenantId,
    organizationId: session?.organizationId,
    headers: session ? buildOperatorSdkHeaders(session) : undefined,
    platform: "pc" as const,
  };

  const customerService = createClient({
    ...shared,
    baseUrl: resolveCustomerServiceApiBaseUrl(customerServiceBaseUrl),
  });
  const drive = createDriveClient({
    ...shared,
    baseUrl: resolveDriveApiBaseUrl(driveBaseUrl),
  });

  if (session?.authToken) {
    customerService.setAuthToken(session.authToken);
    drive.setAuthToken(session.authToken);
  }
  if (session?.accessToken) {
    customerService.setAccessToken(session.accessToken);
    drive.setAccessToken(session.accessToken);
  }

  return { customerService, drive };
}
