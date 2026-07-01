import type { CustomerserviceTicketsListPageData } from './customerservice-tickets-list-page-data';

export interface CustomerserviceTicketsListResponse {
  code: 0;
  data: unknown & CustomerserviceTicketsListPageData;
  /** Server-owned request correlation id. */
  traceId: string;
}
