import { useCallback, useEffect, useState } from "react";
import type { SdkworkBackendClient } from "sdkwork-customerservice-backend-sdk-generated-typescript";
import {
  createAutoReplyRule,
  createChannelAccount,
  deleteAutoReplyRule,
  getChannelAccountRuntimeStatus,
  listAccountDeliveryBlockRules,
  listAutoReplyRules,
  listChannelAccounts,
  registerChannelCredential,
  startChannelAccountRuntime,
  stopChannelAccountRuntime,
  updateAutoReplyRule,
  updateChannelAccount,
  upsertAccountDeliveryBlockRules,
} from "@sdkwork/customerservice-client-core";
import type { OperatorSession } from "@sdkwork/customerservice-pc-core";

interface ChannelAdminPanelProps {
  session: OperatorSession | null;
  backendClient: SdkworkBackendClient;
}

interface ChannelAccountRow {
  id: string;
  pluginCode: string;
  displayName: string;
  connectionState?: string;
  enabled?: boolean;
}

interface AutoReplyRuleRow {
  id: string;
  matchPattern?: string;
  replyContent?: string;
  enabled?: boolean;
}

interface DeliveryBlockRuleRow {
  ruleCode: string;
  ruleName: string;
  enabled: boolean;
  priority: number;
}

export function ChannelAdminPanel({ session, backendClient }: ChannelAdminPanelProps) {
  const [accounts, setAccounts] = useState<ChannelAccountRow[]>([]);
  const [rules, setRules] = useState<AutoReplyRuleRow[]>([]);
  const [deliveryRules, setDeliveryRules] = useState<DeliveryBlockRuleRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [cookiePayload, setCookiePayload] = useState("");
  const [keywordPattern, setKeywordPattern] = useState("");
  const [keywordReply, setKeywordReply] = useState("");
  const [runtimeState, setRuntimeState] = useState<string | null>(null);
  const [accountDisplayName, setAccountDisplayName] = useState("");
  const [accountEnabled, setAccountEnabled] = useState(true);

  const hasSession = Boolean(session?.accessToken || session?.authToken);

  const refresh = useCallback(async () => {
    if (!hasSession) {
      setAccounts([]);
      setRules([]);
      setDeliveryRules([]);
      return;
    }
    setLoading(true);
    setStatusMessage(null);
    try {
      const [accountItems, ruleItems] = await Promise.all([
        listChannelAccounts(backendClient, { pluginCode: "goofish", pageSize: 50 }),
        listAutoReplyRules(backendClient, { pluginCode: "goofish", pageSize: 50 }),
      ]);
      setAccounts(accountItems as ChannelAccountRow[]);
      setRules(ruleItems as AutoReplyRuleRow[]);
      if (selectedAccountId) {
        const deliveryItems = await listAccountDeliveryBlockRules(backendClient, selectedAccountId);
        setDeliveryRules(
          deliveryItems as Array<{
            ruleCode: string;
            ruleName: string;
            enabled: boolean;
            priority: number;
          }>,
        );
      } else {
        setDeliveryRules([]);
      }
      if (!selectedAccountId && accountItems.length > 0) {
        setSelectedAccountId(String(accountItems[0]?.id ?? ""));
      }
      const selected = accountItems.find((item) => String(item?.id) === selectedAccountId);
      if (selected) {
        setAccountDisplayName(String(selected.displayName ?? ""));
        setAccountEnabled(Boolean(selected.enabled ?? true));
      }
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Failed to load channel data");
    } finally {
      setLoading(false);
    }
  }, [backendClient, hasSession, selectedAccountId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCreateAccount = async () => {
    if (!session?.userId || !displayName.trim()) {
      setStatusMessage("Display name and operator session userId are required.");
      return;
    }
    setStatusMessage("Creating channel account…");
    try {
      const created = await createChannelAccount(backendClient, {
        pluginCode: "goofish",
        displayName: displayName.trim(),
        ownerUserId: session.userId,
      });
      if (created?.id) {
        setSelectedAccountId(created.id);
      }
      setDisplayName("");
      await refresh();
      setStatusMessage("Channel account created.");
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Create account failed");
    }
  };

  const onUpdateAccount = async () => {
    if (!selectedAccountId || !accountDisplayName.trim()) {
      setStatusMessage("Select an account and provide a display name.");
      return;
    }
    setStatusMessage("Updating channel account…");
    try {
      await updateChannelAccount(backendClient, selectedAccountId, {
        displayName: accountDisplayName.trim(),
        enabled: accountEnabled,
      });
      await refresh();
      setStatusMessage("Channel account updated.");
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Account update failed");
    }
  };

  const onRegisterCookie = async () => {
    if (!selectedAccountId || !cookiePayload.trim()) {
      setStatusMessage("Select an account and paste a goofish cookie.");
      return;
    }
    setStatusMessage("Registering cookie credential…");
    try {
      await registerChannelCredential(backendClient, selectedAccountId, {
        credentialKind: "cookie",
        payload: cookiePayload.trim(),
      });
      setCookiePayload("");
      setStatusMessage("Cookie credential registered.");
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Credential registration failed");
    }
  };

  const onCreateKeywordRule = async () => {
    if (!keywordPattern.trim() || !keywordReply.trim()) {
      setStatusMessage("Keyword pattern and reply content are required.");
      return;
    }
    setStatusMessage("Creating auto-reply rule…");
    try {
      await createAutoReplyRule(backendClient, {
        pluginCode: "goofish",
        ruleKind: "keyword",
        matchPattern: keywordPattern.trim(),
        replyContent: keywordReply.trim(),
        accountId: selectedAccountId || undefined,
        enabled: true,
      });
      setKeywordPattern("");
      setKeywordReply("");
      await refresh();
      setStatusMessage("Auto-reply rule created.");
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Create rule failed");
    }
  };

  const onToggleRule = async (rule: AutoReplyRuleRow) => {
    setStatusMessage("Updating auto-reply rule…");
    try {
      await updateAutoReplyRule(backendClient, rule.id, {
        enabled: !rule.enabled,
      });
      await refresh();
      setStatusMessage("Auto-reply rule updated.");
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Rule update failed");
    }
  };

  const onDeleteRule = async (ruleId: string) => {
    setStatusMessage("Deleting auto-reply rule…");
    try {
      await deleteAutoReplyRule(backendClient, ruleId);
      await refresh();
      setStatusMessage("Auto-reply rule deleted.");
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Rule delete failed");
    }
  };

  const onToggleDeliveryRule = (ruleCode: string) => {
    setDeliveryRules((current) =>
      current.map((rule) =>
        rule.ruleCode === ruleCode ? { ...rule, enabled: !rule.enabled } : rule,
      ),
    );
  };

  const onSaveDeliveryRules = async () => {
    if (!selectedAccountId) {
      return;
    }
    setStatusMessage("Saving delivery block rules…");
    try {
      await upsertAccountDeliveryBlockRules(backendClient, selectedAccountId, {
        pluginCode: "goofish",
        rules: deliveryRules.map((rule) => ({
          ruleCode: rule.ruleCode,
          enabled: rule.enabled,
          priority: rule.priority,
        })),
      });
      await refresh();
      setStatusMessage("Delivery block rules saved.");
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Delivery rules save failed");
    }
  };

  const onRuntimeAction = async (action: "start" | "stop" | "status") => {
    if (!selectedAccountId) {
      setStatusMessage("Select a channel account first.");
      return;
    }
    setStatusMessage(`${action} runtime…`);
    try {
      if (action === "start") {
        const data = await startChannelAccountRuntime(backendClient, selectedAccountId);
        setRuntimeState(data?.connectionState ?? "unknown");
      } else if (action === "stop") {
        const data = await stopChannelAccountRuntime(backendClient, selectedAccountId);
        setRuntimeState(data?.connectionState ?? "closed");
      } else {
        const data = await getChannelAccountRuntimeStatus(backendClient, selectedAccountId);
        setRuntimeState(
          `${data?.connectionState ?? "unknown"} (workerActive=${String(data?.workerActive ?? false)})`,
        );
      }
      await refresh();
      setStatusMessage(`Runtime ${action} completed.`);
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : `Runtime ${action} failed`);
    }
  };

  return (
    <section aria-labelledby="channel-admin-heading" style={{ marginTop: "1.5rem" }}>
      <h2 id="channel-admin-heading">Channel accounts (Goofish)</h2>
      {!hasSession ? (
        <p style={{ color: "#57606a" }}>Save an operator session to manage channel accounts.</p>
      ) : null}
      {loading ? <p>Loading channel accounts…</p> : null}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <input
          type="text"
          placeholder="Display name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          style={{ minWidth: "12rem" }}
        />
        <button type="button" onClick={() => void onCreateAccount()} disabled={!hasSession}>
          Create account
        </button>
        <button type="button" onClick={() => void refresh()} disabled={!hasSession}>
          Refresh
        </button>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {accounts.map((account) => (
          <li
            key={account.id}
            style={{
              border: "1px solid #d0d7de",
              borderRadius: "8px",
              padding: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="radio"
                name="channel-account"
                checked={selectedAccountId === account.id}
                onChange={() => setSelectedAccountId(account.id)}
              />
              {account.displayName} ({account.pluginCode}) — {account.connectionState ?? "disconnected"}
            </label>
          </li>
        ))}
      </ul>
      {selectedAccountId ? (
        <div style={{ marginTop: "1rem" }}>
          <h3>Account settings</h3>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Display name"
              value={accountDisplayName}
              onChange={(event) => setAccountDisplayName(event.target.value)}
              style={{ minWidth: "12rem" }}
            />
            <label style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={accountEnabled}
                onChange={(event) => setAccountEnabled(event.target.checked)}
              />
              Enabled
            </label>
            <button type="button" onClick={() => void onUpdateAccount()} disabled={!hasSession}>
              Save account
            </button>
          </div>
        </div>
      ) : null}
      <div style={{ marginTop: "1rem" }}>
        <h3>Cookie credential</h3>
        <textarea
          rows={3}
          placeholder="Paste goofish cookie (must include unb=)"
          value={cookiePayload}
          onChange={(event) => setCookiePayload(event.target.value)}
          style={{ width: "100%", maxWidth: "640px" }}
        />
        <div style={{ marginTop: "0.5rem" }}>
          <button type="button" onClick={() => void onRegisterCookie()} disabled={!hasSession}>
            Register cookie
          </button>
        </div>
      </div>
      <div style={{ marginTop: "1rem" }}>
        <h3>Runtime control</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" onClick={() => void onRuntimeAction("start")} disabled={!hasSession}>
            Start worker
          </button>
          <button type="button" onClick={() => void onRuntimeAction("stop")} disabled={!hasSession}>
            Stop worker
          </button>
          <button type="button" onClick={() => void onRuntimeAction("status")} disabled={!hasSession}>
            Status
          </button>
        </div>
        {runtimeState ? <p style={{ color: "#57606a" }}>Runtime: {runtimeState}</p> : null}
      </div>
      <div style={{ marginTop: "1rem" }}>
        <h3>Keyword auto-reply</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "640px" }}>
          <input
            type="text"
            placeholder="Match pattern (substring)"
            value={keywordPattern}
            onChange={(event) => setKeywordPattern(event.target.value)}
          />
          <input
            type="text"
            placeholder="Reply content"
            value={keywordReply}
            onChange={(event) => setKeywordReply(event.target.value)}
          />
          <button type="button" onClick={() => void onCreateKeywordRule()} disabled={!hasSession}>
            Add keyword rule
          </button>
        </div>
        <ul style={{ marginTop: "0.75rem" }}>
          {rules.map((rule) => (
            <li key={rule.id} style={{ marginBottom: "0.5rem" }}>
              [{rule.enabled ? "on" : "off"}] {rule.matchPattern ?? "*"} → {rule.replyContent}{" "}
              <button type="button" onClick={() => void onToggleRule(rule)} disabled={!hasSession}>
                Toggle
              </button>{" "}
              <button type="button" onClick={() => void onDeleteRule(rule.id)} disabled={!hasSession}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ marginTop: "1rem" }}>
        <h3>Delivery block rules</h3>
        <ul style={{ marginTop: "0.75rem" }}>
          {deliveryRules.map((rule) => (
            <li key={rule.ruleCode} style={{ marginBottom: "0.5rem" }}>
              <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => onToggleDeliveryRule(rule.ruleCode)}
                  disabled={!hasSession}
                />
                {rule.ruleName} (priority {rule.priority})
              </label>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => void onSaveDeliveryRules()} disabled={!hasSession || !selectedAccountId}>
          Save delivery rules
        </button>
      </div>
      {statusMessage ? <p style={{ color: "#57606a", marginTop: "0.75rem" }}>{statusMessage}</p> : null}
    </section>
  );
}
