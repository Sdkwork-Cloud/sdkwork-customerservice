import type { CustomerserviceTicketsAdminRetrieveResourceData } from './customerservice-tickets-admin-retrieve-resource-data';

export interface CustomerserviceTicketsAdminRetrieveResponse {
  code: 0;
  data: unknown & CustomerserviceTicketsAdminRetrieveResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
