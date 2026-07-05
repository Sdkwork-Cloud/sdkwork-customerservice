import type {
  PluginCatalogEntry,
  PluginEnablementSummary,
  SdkworkBackendClient,
  UpsertPluginEnablementRequest,
} from "@sdkwork/customerservice-backend-sdk";

function pluginsAdmin(client: SdkworkBackendClient) {
  return client.customerServicePluginsAdmin.customerservice.plugins.admin;
}

export async function listPluginCatalog(
  client: SdkworkBackendClient,
): Promise<PluginCatalogEntry[]> {
  const page = await pluginsAdmin(client).list();
  return page.items;
}

export async function upsertPluginEnablement(
  client: SdkworkBackendClient,
  pluginCode: string,
  body: UpsertPluginEnablementRequest,
): Promise<PluginEnablementSummary> {
  return pluginsAdmin(client).enablement.upsert(pluginCode, body);
}
