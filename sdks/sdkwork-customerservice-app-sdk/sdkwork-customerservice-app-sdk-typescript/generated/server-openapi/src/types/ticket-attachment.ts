export interface TicketAttachment {
  id: string;
  ticketId: string;
  driveNodeId: string;
  fileName: string;
  contentType?: string | null;
  sizeBytes?: string | null;
  uploadedByUserId: string;
  createdAt: string;
}
