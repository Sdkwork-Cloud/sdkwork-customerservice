export interface PluginCatalogEntry {
  id: string;
  pluginCode: string;
  displayName: string;
  version: string;
  capabilities: string[];
  status: string;
  tenantEnabled?: boolean | null;
  createdAt: string;
  updatedAt: string;
}
