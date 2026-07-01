import type { CustomerserviceTicketsMessagesListPageData } from './customerservice-tickets-messages-list-page-data';

export interface CustomerserviceTicketsMessagesListResponse {
  code: 0;
  data: unknown & CustomerserviceTicketsMessagesListPageData;
  /** Server-owned request correlation id. */
  traceId: string;
}
