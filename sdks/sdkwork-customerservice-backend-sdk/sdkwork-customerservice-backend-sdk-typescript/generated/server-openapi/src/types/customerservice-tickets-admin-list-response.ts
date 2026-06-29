import type { TicketSummary } from './ticket-summary';

export interface CustomerserviceTicketsAdminListResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
