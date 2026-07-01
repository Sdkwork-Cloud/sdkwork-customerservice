import type { CustomerserviceTicketsAdminListPageData } from './customerservice-tickets-admin-list-page-data';

export interface CustomerserviceTicketsAdminListResponse {
  code: 0;
  data: unknown & CustomerserviceTicketsAdminListPageData;
  /** Server-owned request correlation id. */
  traceId: string;
}
