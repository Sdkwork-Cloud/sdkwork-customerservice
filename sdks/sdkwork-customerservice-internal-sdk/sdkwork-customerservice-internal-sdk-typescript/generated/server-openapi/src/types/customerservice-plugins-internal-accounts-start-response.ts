import type { CustomerservicePluginsInternalAccountsStartResourceData } from './customerservice-plugins-internal-accounts-start-resource-data';

export interface CustomerservicePluginsInternalAccountsStartResponse {
  code: 0;
  data: unknown & CustomerservicePluginsInternalAccountsStartResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
