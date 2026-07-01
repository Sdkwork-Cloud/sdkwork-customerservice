import type { CustomerservicePluginsAdminListPageData } from './customerservice-plugins-admin-list-page-data';

export interface CustomerservicePluginsAdminListResponse {
  code: 0;
  data: unknown & CustomerservicePluginsAdminListPageData;
  /** Server-owned request correlation id. */
  traceId: string;
}
