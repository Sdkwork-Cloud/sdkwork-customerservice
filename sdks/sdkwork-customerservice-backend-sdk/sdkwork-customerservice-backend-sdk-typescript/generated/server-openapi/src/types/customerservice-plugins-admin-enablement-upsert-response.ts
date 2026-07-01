import type { CustomerservicePluginsAdminEnablementUpsertResourceData } from './customerservice-plugins-admin-enablement-upsert-resource-data';

export interface CustomerservicePluginsAdminEnablementUpsertResponse {
  code: 0;
  data: unknown & CustomerservicePluginsAdminEnablementUpsertResourceData;
  /** Server-owned request correlation id. */
  traceId: string;
}
