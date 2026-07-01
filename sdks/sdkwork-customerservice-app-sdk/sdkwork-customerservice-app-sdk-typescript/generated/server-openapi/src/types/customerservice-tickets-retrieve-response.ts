import type { CustomerserviceTicketsRetrieveResourceData } from './customerservice-tickets-retrieve-resource-data';

export interface CustomerserviceTicketsRetrieveResponse {
  code: 0;
  data: unknown & CustomerserviceTicketsRetrieveResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
