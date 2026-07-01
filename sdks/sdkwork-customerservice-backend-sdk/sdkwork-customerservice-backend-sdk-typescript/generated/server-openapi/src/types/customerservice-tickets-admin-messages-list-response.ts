import type { CustomerserviceTicketsAdminMessagesListPageData } from './customerservice-tickets-admin-messages-list-page-data';

export interface CustomerserviceTicketsAdminMessagesListResponse {
  code: 0;
  data: unknown & CustomerserviceTicketsAdminMessagesListPageData;
  /** Server-owned request correlation id. */
  traceId: string;
}
