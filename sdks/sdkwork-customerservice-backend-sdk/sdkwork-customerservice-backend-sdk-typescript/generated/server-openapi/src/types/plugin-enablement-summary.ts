export interface PluginEnablementSummary {
  id?: string;
  tenantId?: string;
  pluginCode?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}
