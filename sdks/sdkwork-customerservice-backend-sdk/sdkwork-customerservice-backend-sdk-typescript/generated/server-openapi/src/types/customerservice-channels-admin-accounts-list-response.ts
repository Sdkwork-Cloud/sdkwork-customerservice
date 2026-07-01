import type { CustomerserviceChannelsAdminAccountsListPageData } from './customerservice-channels-admin-accounts-list-page-data';

export interface CustomerserviceChannelsAdminAccountsListResponse {
  code: 0;
  data: unknown & CustomerserviceChannelsAdminAccountsListPageData;
  /** Server-owned request correlation id. */
  traceId: string;
}
