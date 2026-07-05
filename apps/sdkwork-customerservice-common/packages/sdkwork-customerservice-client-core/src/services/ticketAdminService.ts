import type {
  TicketDetail,
  TicketMessage,
  TicketSummary,
  UpdateTicketRequest,
} from "@sdkwork/customerservice-contracts";
import type { SdkworkBackendClient } from "@sdkwork/customerservice-backend-sdk";

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
): Promise<TicketSummary[]> {
  const page = await backendTicketsAdmin(client).list({
    status: params?.status,
    page: params?.page,
    pageSize: params?.pageSize,
  });
  return page.items;
}

export async function retrieveOperatorTicket(
  client: SdkworkBackendClient,
  ticketId: string,
): Promise<TicketDetail> {
  return backendTicketsAdmin(client).retrieve(ticketId);
}

export async function updateOperatorTicket(
  client: SdkworkBackendClient,
  ticketId: string,
  body: UpdateTicketRequest,
): Promise<TicketDetail> {
  return backendTicketsAdmin(client).update(ticketId, body);
}

export async function listOperatorTicketMessages(
  client: SdkworkBackendClient,
  ticketId: string,
): Promise<TicketMessage[]> {
  const page = await backendTicketsAdmin(client).messages.list(ticketId);
  return page.items;
}

export async function sendOperatorTicketMessage(
  client: SdkworkBackendClient,
  ticketId: string,
  body: string,
): Promise<TicketMessage> {
  return backendTicketsAdmin(client).messages.create(ticketId, { body });
}
