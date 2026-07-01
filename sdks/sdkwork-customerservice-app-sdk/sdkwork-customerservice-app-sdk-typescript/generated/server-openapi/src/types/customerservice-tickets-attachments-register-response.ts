import type { CustomerserviceTicketsAttachmentsRegisterResourceData } from './customerservice-tickets-attachments-register-resource-data';

export interface CustomerserviceTicketsAttachmentsRegisterResponse {
  code: 0;
  data: unknown & CustomerserviceTicketsAttachmentsRegisterResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
