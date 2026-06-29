import type { TicketDetail } from './ticket-detail';

export interface CustomerserviceTicketsCreateResponse201 {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
