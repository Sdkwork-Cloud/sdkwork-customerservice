import type {
  CreateTicketRequest,
  RegisterTicketAttachmentRequest,
  TicketAttachment,
  TicketDetail,
  TicketMessage,
  TicketSummary,
} from "@sdkwork/customerservice-contracts";
import type { SdkworkAppClient } from "sdkwork-customerservice-app-sdk-generated-typescript";

export interface TicketAppListParams {
  status?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
}

function appTickets(client: SdkworkAppClient) {
  return client.customerServiceTickets.customerservice.tickets;
}

export async function listMyTickets(
  client: SdkworkAppClient,
  params?: TicketAppListParams,
): Promise<TicketSummary[]> {
  const page = await appTickets(client).list(params);
  return page.items;
}

export async function createMyTicket(
  client: SdkworkAppClient,
  body: CreateTicketRequest,
): Promise<TicketDetail> {
  return appTickets(client).create(body);
}

export async function retrieveMyTicket(
  client: SdkworkAppClient,
  ticketId: string,
): Promise<TicketDetail> {
  return appTickets(client).retrieve(ticketId);
}

export async function listMyTicketMessages(
  client: SdkworkAppClient,
  ticketId: string,
): Promise<TicketMessage[]> {
  const page = await appTickets(client).messages.list(ticketId);
  return page.items;
}

export async function sendMyTicketMessage(
  client: SdkworkAppClient,
  ticketId: string,
  body: string,
): Promise<TicketMessage> {
  return appTickets(client).messages.create(ticketId, { body });
}

export async function listMyTicketAttachments(
  client: SdkworkAppClient,
  ticketId: string,
): Promise<TicketAttachment[]> {
  const page = await appTickets(client).attachments.list(ticketId);
  return page.items;
}

export async function registerMyTicketAttachment(
  client: SdkworkAppClient,
  ticketId: string,
  body: RegisterTicketAttachmentRequest,
): Promise<TicketAttachment> {
  return appTickets(client).attachments.register(ticketId, body);
}
