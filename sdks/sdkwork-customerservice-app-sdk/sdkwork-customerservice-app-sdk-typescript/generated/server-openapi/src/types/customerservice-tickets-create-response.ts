import type { CustomerserviceTicketsCreateResourceData } from './customerservice-tickets-create-resource-data';

export interface CustomerserviceTicketsCreateResponse {
  code: 0;
  data: unknown & CustomerserviceTicketsCreateResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
