import type {
  TicketDetail,
  TicketMessage,
  TicketSummary,
  UpdateTicketRequest,
} from "@sdkwork/customerservice-contracts";
import type { SdkworkBackendClient } from "sdkwork-customerservice-backend-sdk-generated-typescript";

import { unwrapSdkListItems, unwrapSdkPayload } from "../utils/unwrapSdkPayload";

export interface TicketAdminListParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

function backendTicketsAdmin(client: SdkworkBackendClient) {
  return client.customerServiceTicketsAdmin.customerservice.tickets.admin;
}

export async function listOperatorTickets(
  client: SdkworkBackendClient,
  params?: TicketAdminListParams,
) {
  const response = await backendTicketsAdmin(client).list({
    status: params?.status,
    page: params?.page,
    pageSize: params?.pageSize,
  });
  return unwrapSdkListItems(response) as TicketSummary[];
}

export async function retrieveOperatorTicket(
  client: SdkworkBackendClient,
  ticketId: string,
): Promise<TicketDetail | undefined> {
  const response = await backendTicketsAdmin(client).retrieve(ticketId);
  return unwrapSdkPayload(response) as TicketDetail | undefined;
}

export async function updateOperatorTicket(
  client: SdkworkBackendClient,
  ticketId: string,
  body: UpdateTicketRequest,
): Promise<TicketDetail | undefined> {
  const response = await backendTicketsAdmin(client).update(ticketId, body);
  return unwrapSdkPayload(response) as TicketDetail | undefined;
}

export async function listOperatorTicketMessages(
  client: SdkworkBackendClient,
  ticketId: string,
): Promise<TicketMessage[]> {
  const response = await backendTicketsAdmin(client).messages.list(ticketId);
  return unwrapSdkListItems(response) as TicketMessage[];
}

export async function sendOperatorTicketMessage(
  client: SdkworkBackendClient,
  ticketId: string,
  body: string,
): Promise<TicketMessage | undefined> {
  const response = await backendTicketsAdmin(client).messages.create(ticketId, { body });
  return unwrapSdkPayload(response) as TicketMessage | undefined;
}
