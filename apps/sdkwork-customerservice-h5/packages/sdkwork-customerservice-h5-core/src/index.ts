import { createClient, type SdkworkAppClient } from "sdkwork-customerservice-app-sdk-generated-typescript";
import type { TicketSummary } from "@sdkwork/customerservice-contracts";
import { resolveCustomerServiceApiBaseUrl, unwrapSdkListItems } from "@sdkwork/customerservice-client-core";

export interface EndUserSession {
  authToken?: string;
  accessToken?: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
}

export interface CreateAppSdkClientOptions {
  apiBaseUrl?: string;
  session: EndUserSession | null;
}

export function createCustomerServiceAppClient({
  apiBaseUrl,
  session,
}: CreateAppSdkClientOptions): SdkworkAppClient {
  const client = createClient({
    baseUrl: resolveCustomerServiceApiBaseUrl(apiBaseUrl),
    authToken: session?.authToken,
    accessToken: session?.accessToken,
    tenantId: session?.tenantId,
    organizationId: session?.organizationId,
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

export async function listMyTickets(client: SdkworkAppClient): Promise<TicketSummary[]> {
  const response = await client.customerServiceTickets.customerservice.tickets.list({});
  return unwrapSdkListItems<TicketSummary>(response);
}

export {
  buildOperatorSdkHeaders,
  createCustomerServiceBackendClient,
  loadOperatorSession,
  saveOperatorSession,
  type CreateBackendSdkClientOptions,
  type OperatorSession,
} from "./operatorBackendClient";
