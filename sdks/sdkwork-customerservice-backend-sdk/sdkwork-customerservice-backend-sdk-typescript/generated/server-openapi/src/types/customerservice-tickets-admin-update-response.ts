import type { CustomerserviceTicketsAdminUpdateResourceData } from './customerservice-tickets-admin-update-resource-data';

export interface CustomerserviceTicketsAdminUpdateResponse {
  code: 0;
  data: unknown & CustomerserviceTicketsAdminUpdateResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
