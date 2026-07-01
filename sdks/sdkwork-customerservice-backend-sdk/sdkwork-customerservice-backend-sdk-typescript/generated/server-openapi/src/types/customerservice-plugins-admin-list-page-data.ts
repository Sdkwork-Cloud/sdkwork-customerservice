import type { PageInfo } from './page-info';
import type { PluginCatalogEntry } from './plugin-catalog-entry';

export interface CustomerservicePluginsAdminListPageData {
  items: PluginCatalogEntry[];
  pageInfo: PageInfo;
}
