import { useCallback, useEffect, useState } from "react";
import type { SdkworkBackendClient } from "@sdkwork/customerservice-backend-sdk";
import type { PluginCatalogEntry } from "@sdkwork/customerservice-contracts";
import {
  formatSdkError,
  listPluginCatalog,
  upsertPluginEnablement,
} from "@sdkwork/customerservice-client-core";
import type { OperatorSession } from "@sdkwork/customerservice-pc-core";

export function PluginAdminPanel({
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
    <section aria-labelledby="plugin-admin-heading" style={{ marginTop: "1.5rem" }}>
      <h2 id="plugin-admin-heading">Plugin enablement</h2>
      <p style={{ color: "#57606a" }}>Tenant-level marketplace plugin toggles.</p>
      {!hasSession ? <p style={{ color: "#57606a" }}>Sign in to manage plugins.</p> : null}
      {loading ? <p style={{ color: "#57606a" }}>Loading plugin catalog…</p> : null}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {plugins.map((plugin) => (
          <li
            key={plugin.pluginCode}
            style={{
              border: "1px solid #d0d7de",
              borderRadius: 8,
              marginBottom: 8,
              padding: "0.75rem 1rem",
            }}
          >
            <strong>{plugin.displayName}</strong> ({plugin.pluginCode}) — {plugin.status}
            <div style={{ marginTop: 8 }}>
              <label>
                <input
                  checked={Boolean(plugin.tenantEnabled)}
                  type="checkbox"
                  onChange={() => void togglePlugin(plugin)}
                />{" "}
                Enabled for tenant
              </label>
            </div>
          </li>
        ))}
      </ul>
      {statusMessage ? <p style={{ color: "#57606a" }}>{statusMessage}</p> : null}
    </section>
  );
}
