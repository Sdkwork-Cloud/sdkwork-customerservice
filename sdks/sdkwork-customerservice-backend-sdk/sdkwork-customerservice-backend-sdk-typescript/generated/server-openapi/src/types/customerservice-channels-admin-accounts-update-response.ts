import type { CustomerserviceChannelsAdminAccountsUpdateResourceData } from './customerservice-channels-admin-accounts-update-resource-data';

export interface CustomerserviceChannelsAdminAccountsUpdateResponse {
  code: 0;
  data: unknown & CustomerserviceChannelsAdminAccountsUpdateResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
