export interface UpsertPluginEnablementRequest {
  enabled: boolean;
  config?: Record<string, unknown>;
}
