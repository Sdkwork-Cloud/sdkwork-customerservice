export interface PluginCatalogEntry {
  id?: string;
  pluginCode?: string;
  displayName?: string;
  version?: string;
  capabilities?: string[];
  status?: string;
  tenantEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
