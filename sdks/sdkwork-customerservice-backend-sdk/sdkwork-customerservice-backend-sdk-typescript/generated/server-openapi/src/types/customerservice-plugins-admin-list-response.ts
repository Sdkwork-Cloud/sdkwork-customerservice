import type { PageInfo } from './page-info';
import type { PluginCatalogEntry } from './plugin-catalog-entry';

export interface CustomerservicePluginsAdminListResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
