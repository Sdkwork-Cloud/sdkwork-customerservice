import type { PageInfo } from './page-info';
import type { TicketMessage } from './ticket-message';

export interface CustomerserviceTicketsAdminMessagesListResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
