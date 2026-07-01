import type { CustomerserviceTicketsAdminMessagesCreateResourceData } from './customerservice-tickets-admin-messages-create-resource-data';

export interface CustomerserviceTicketsAdminMessagesCreateResponse {
  code: 0;
  data: unknown & CustomerserviceTicketsAdminMessagesCreateResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
