import type { AccountRuntimeStatus } from './account-runtime-status';

export interface CustomerservicePluginsInternalAccountsStopResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
