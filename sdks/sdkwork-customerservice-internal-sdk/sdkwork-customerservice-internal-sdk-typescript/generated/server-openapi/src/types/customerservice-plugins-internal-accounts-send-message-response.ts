import type { SendPluginMessageResult } from './send-plugin-message-result';

export interface CustomerservicePluginsInternalAccountsSendMessageResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
