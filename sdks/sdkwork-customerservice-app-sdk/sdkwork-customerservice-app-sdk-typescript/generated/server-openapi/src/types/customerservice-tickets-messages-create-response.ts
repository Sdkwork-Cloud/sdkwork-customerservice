import type { CustomerserviceTicketsMessagesCreateResourceData } from './customerservice-tickets-messages-create-resource-data';

export interface CustomerserviceTicketsMessagesCreateResponse {
  code: 0;
  data: unknown & CustomerserviceTicketsMessagesCreateResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
