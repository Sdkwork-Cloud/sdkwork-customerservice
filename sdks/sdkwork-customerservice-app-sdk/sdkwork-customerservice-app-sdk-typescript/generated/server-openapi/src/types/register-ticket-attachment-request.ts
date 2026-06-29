export interface RegisterTicketAttachmentRequest {
  driveNodeId: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: string;
}
