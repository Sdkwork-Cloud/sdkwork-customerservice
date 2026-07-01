import type { CustomerservicePluginsInternalAccountsStatusResourceData } from './customerservice-plugins-internal-accounts-status-resource-data';

export interface CustomerservicePluginsInternalAccountsStatusResponse {
  code: 0;
  data: unknown & CustomerservicePluginsInternalAccountsStatusResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
