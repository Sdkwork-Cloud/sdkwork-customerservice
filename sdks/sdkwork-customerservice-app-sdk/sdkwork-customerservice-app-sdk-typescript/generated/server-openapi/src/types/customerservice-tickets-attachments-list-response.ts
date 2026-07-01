import type { CustomerserviceTicketsAttachmentsListPageData } from './customerservice-tickets-attachments-list-page-data';

export interface CustomerserviceTicketsAttachmentsListResponse {
  code: 0;
  data: unknown & CustomerserviceTicketsAttachmentsListPageData;
  /** Server-owned request correlation id. */
  traceId: string;
}
