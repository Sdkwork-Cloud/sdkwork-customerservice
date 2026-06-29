import type { PageInfo } from './page-info';
import type { TicketAttachment } from './ticket-attachment';

export interface CustomerserviceTicketsAttachmentsListResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
