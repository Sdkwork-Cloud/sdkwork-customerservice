export {
  listOperatorTickets,
  retrieveOperatorTicket,
  updateOperatorTicket,
  listOperatorTicketMessages,
  sendOperatorTicketMessage,
  type TicketAdminListParams,
} from "@sdkwork/customerservice-client-core";

import type { SdkworkAppClient } from "@sdkwork/customerservice-app-sdk";

export async function registerTicketAttachmentMetadata(
  appClient: SdkworkAppClient,
  ticketId: string,
  body: {
    driveNodeId: string;
    fileName: string;
    contentType?: string;
    sizeBytes?: number;
  },
) {
  return appClient.customerServiceTickets.customerservice.tickets.attachments.register(
    ticketId,
    {
      driveNodeId: body.driveNodeId,
      fileName: body.fileName,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes === undefined ? undefined : String(body.sizeBytes),
    },
  );
}
