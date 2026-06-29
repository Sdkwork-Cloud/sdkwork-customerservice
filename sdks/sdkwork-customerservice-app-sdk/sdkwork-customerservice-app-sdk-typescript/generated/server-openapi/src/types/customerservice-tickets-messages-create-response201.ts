import type { TicketMessage } from './ticket-message';

export interface CustomerserviceTicketsMessagesCreateResponse201 {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
