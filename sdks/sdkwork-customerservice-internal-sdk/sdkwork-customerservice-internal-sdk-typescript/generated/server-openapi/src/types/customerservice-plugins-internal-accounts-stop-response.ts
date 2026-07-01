import type { CustomerservicePluginsInternalAccountsStopResourceData } from './customerservice-plugins-internal-accounts-stop-resource-data';

export interface CustomerservicePluginsInternalAccountsStopResponse {
  code: 0;
  data: unknown & CustomerservicePluginsInternalAccountsStopResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
