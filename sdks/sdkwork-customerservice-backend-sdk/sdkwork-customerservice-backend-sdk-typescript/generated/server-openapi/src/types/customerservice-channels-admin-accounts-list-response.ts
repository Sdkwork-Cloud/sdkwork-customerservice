import type { ChannelAccountSummary } from './channel-account-summary';
import type { PageInfo } from './page-info';

export interface CustomerserviceChannelsAdminAccountsListResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
