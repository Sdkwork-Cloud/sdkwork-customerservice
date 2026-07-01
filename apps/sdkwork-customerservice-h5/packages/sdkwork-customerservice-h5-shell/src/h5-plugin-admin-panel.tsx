import { useCallback, useEffect, useState } from "react";
import type { SdkworkBackendClient } from "sdkwork-customerservice-backend-sdk-generated-typescript";
import type { PluginCatalogEntry } from "@sdkwork/customerservice-contracts";
import {
  formatSdkError,
  listPluginCatalog,
  upsertPluginEnablement,
} from "@sdkwork/customerservice-client-core";
import type { OperatorSession } from "@sdkwork/customerservice-h5-core";

export function H5PluginAdminPanel({
  session,
  backendClient,
}: {
  session: OperatorSession | null;
  backendClient: SdkworkBackendClient;
}) {
  const hasSession = Boolean(session?.accessToken || session?.authToken);
  const [plugins, setPlugins] = useState<PluginCatalogEntry[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!hasSession) {
      setPlugins([]);
      return;
    }
    setLoading(true);
    try {
      setPlugins(await listPluginCatalog(backendClient));
      setStatusMessage(null);
    } catch (cause: unknown) {
      setStatusMessage(formatSdkError(cause));
    } finally {
      setLoading(false);
    }
  }, [backendClient, hasSession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function togglePlugin(plugin: PluginCatalogEntry) {
    const nextEnabled = !(plugin.tenantEnabled ?? false);
    setStatusMessage(`Updating ${plugin.pluginCode}…`);
    try {
      await upsertPluginEnablement(backendClient, plugin.pluginCode, {
        enabled: nextEnabled,
        config: {},
      });
      await refresh();
      setStatusMessage(`${plugin.pluginCode} ${nextEnabled ? "enabled" : "disabled"}.`);
    } catch (cause: unknown) {
      setStatusMessage(formatSdkError(cause));
    }
  }

  return (
    <section aria-labelledby="h5-plugin-admin-heading">
      <h2 id="h5-plugin-admin-heading">Plugins</h2>
      {loading ? <p className="hint">Loading plugin catalog…</p> : null}
      <ul className="h5-list">
        {plugins.map((plugin) => (
          <li key={plugin.pluginCode}>
            <strong>{plugin.displayName}</strong> ({plugin.pluginCode})
            <label className="h5-checkbox">
              <input
                checked={Boolean(plugin.tenantEnabled)}
                type="checkbox"
                onChange={() => void togglePlugin(plugin)}
              />
              Enabled
            </label>
          </li>
        ))}
      </ul>
      {statusMessage ? <p className="hint">{statusMessage}</p> : null}
    </section>
  );
}
