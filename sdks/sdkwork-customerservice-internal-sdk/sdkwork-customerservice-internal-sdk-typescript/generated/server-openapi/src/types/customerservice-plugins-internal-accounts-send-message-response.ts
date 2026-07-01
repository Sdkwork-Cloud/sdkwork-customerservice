import type { CustomerservicePluginsInternalAccountsSendMessageResourceData } from './customerservice-plugins-internal-accounts-send-message-resource-data';

export interface CustomerservicePluginsInternalAccountsSendMessageResponse {
  code: 0;
  data: unknown & CustomerservicePluginsInternalAccountsSendMessageResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
