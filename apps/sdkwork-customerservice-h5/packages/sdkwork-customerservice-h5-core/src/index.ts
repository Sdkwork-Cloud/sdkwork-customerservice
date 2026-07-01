import { createClient, type SdkworkAppClient } from "sdkwork-customerservice-app-sdk-generated-typescript";
import { createClient as createDriveClient, type SdkworkDriveAppClient } from "@sdkwork/drive-app-sdk";
import {
  buildOperatorSdkHeaders,
  createDriveAttachmentUploadPort,
  loadOperatorSessionFromStorage,
  listMyTickets,
  resolveDriveApiBaseUrl,
  saveOperatorSessionToStorage,
  toOperatorSession,
  type DriveAttachmentUploadPort,
  type OperatorSession,
} from "@sdkwork/customerservice-client-core";
import { resolveCustomerServiceApiBaseUrl } from "@sdkwork/customerservice-client-core";

import { loadCustomerServiceH5IamSession } from "./session/iamSession";

export type EndUserSession = OperatorSession;

/** @deprecated Legacy storage key; IAM session is canonical. */
export const END_USER_SESSION_STORAGE_KEY = "sdkwork.customerservice.h5.end-user.session";

function loadUnifiedH5Session(): EndUserSession | null {
  return (
    toOperatorSession(loadCustomerServiceH5IamSession()) ??
    loadOperatorSessionFromStorage(END_USER_SESSION_STORAGE_KEY)
  );
}

export function loadEndUserSession(): EndUserSession | null {
  return loadUnifiedH5Session();
}

export function saveEndUserSession(session: EndUserSession | null): void {
  saveOperatorSessionToStorage(END_USER_SESSION_STORAGE_KEY, session);
}

export interface CreateAppSdkClientOptions {
  apiBaseUrl?: string;
  driveBaseUrl?: string;
  session?: EndUserSession | null;
}

function applySessionTokens<T extends { setAuthToken(token: string): void; setAccessToken(token: string): void }>(
  client: T,
  session: EndUserSession | null,
): T {
  if (session?.authToken) {
    client.setAuthToken(session.authToken);
  }
  if (session?.accessToken) {
    client.setAccessToken(session.accessToken);
  }
  return client;
}

function sharedClientOptions(session: EndUserSession | null) {
  return {
    authToken: session?.authToken,
    accessToken: session?.accessToken,
    tenantId: session?.tenantId,
    organizationId: session?.organizationId,
    headers: session ? buildOperatorSdkHeaders(session) : undefined,
    platform: "h5" as const,
  };
}

export function createCustomerServiceAppClient({
  apiBaseUrl,
  session = loadUnifiedH5Session(),
}: CreateAppSdkClientOptions = {}): SdkworkAppClient {
  const client = createClient({
    ...sharedClientOptions(session),
    baseUrl: resolveCustomerServiceApiBaseUrl(apiBaseUrl),
  });
  return applySessionTokens(client, session);
}

export function createCustomerServiceDriveClient({
  driveBaseUrl,
  session = loadUnifiedH5Session(),
}: Pick<CreateAppSdkClientOptions, "driveBaseUrl" | "session"> = {}): SdkworkDriveAppClient {
  const client = createDriveClient({
    ...sharedClientOptions(session),
    baseUrl: resolveDriveApiBaseUrl(driveBaseUrl),
  });
  return applySessionTokens(client, session);
}

export function createEndUserDriveAttachmentUploadPort(
  session: EndUserSession | null = loadUnifiedH5Session(),
  driveBaseUrl?: string,
): DriveAttachmentUploadPort {
  return createDriveAttachmentUploadPort(createCustomerServiceDriveClient({ session, driveBaseUrl }), {
    source: "customerservice_h5",
  });
}

export { listMyTickets };

export {
  loadOperatorSession,
  saveOperatorSession,
  createCustomerServiceBackendClient,
  OPERATOR_SESSION_STORAGE_KEY,
  type CreateBackendSdkClientOptions,
  type OperatorSession,
} from "./operatorBackendClient";

export {
  CUSTOMER_SERVICE_H5_IAM_SESSION_CHANGED_EVENT,
  CUSTOMER_SERVICE_H5_IAM_SESSION_STORAGE_KEY,
  clearCustomerServiceH5IamSession,
  commitCustomerServiceH5IamSession,
  getH5GlobalTokenManager,
  isH5IamSessionAuthenticated,
  loadCustomerServiceH5IamSession,
  toOperatorSession,
  type CustomerServiceIamSession,
} from "./session/iamSession";

export {
  getCustomerServiceH5IamRuntime,
  resetCustomerServiceH5IamRuntime,
  resolveCustomerServiceH5AuthAppearance,
  resolveCustomerServiceAuthRuntimeConfig,
} from "./sdk/appAuthRuntime";
