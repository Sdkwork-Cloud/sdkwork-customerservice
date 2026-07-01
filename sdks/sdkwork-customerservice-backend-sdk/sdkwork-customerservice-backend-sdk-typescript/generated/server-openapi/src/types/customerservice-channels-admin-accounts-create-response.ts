import type { CustomerserviceChannelsAdminAccountsCreateResourceData } from './customerservice-channels-admin-accounts-create-resource-data';

export interface CustomerserviceChannelsAdminAccountsCreateResponse {
  code: 0;
  data: unknown & CustomerserviceChannelsAdminAccountsCreateResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
