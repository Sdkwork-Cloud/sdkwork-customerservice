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
import type { OperatorSession } from "@sdkwork/customerservice-h5-core";

interface H5ChannelAdminPanelProps {
  session: OperatorSession | null;
  backendClient: SdkworkBackendClient;
}

export function H5ChannelAdminPanel({ session, backendClient }: H5ChannelAdminPanelProps) {
  const [accounts, setAccounts] = useState<Array<{ id: string; displayName: string; connectionState?: string; enabled?: boolean }>>([]);
  const [rules, setRules] = useState<Array<{ id: string; matchPattern?: string; replyContent?: string; enabled?: boolean }>>([]);
  const [deliveryRules, setDeliveryRules] = useState<Array<{ ruleCode: string; ruleName: string; enabled: boolean; priority: number }>>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [accountDisplayName, setAccountDisplayName] = useState("");
  const [accountEnabled, setAccountEnabled] = useState(true);
  const [cookiePayload, setCookiePayload] = useState("");
  const [keywordPattern, setKeywordPattern] = useState("");
  const [keywordReply, setKeywordReply] = useState("");
  const hasSession = Boolean(session?.accessToken || session?.authToken);

  const refresh = useCallback(async () => {
    if (!hasSession) {
      setAccounts([]);
      setRules([]);
      setDeliveryRules([]);
      return;
    }
    try {
      const [accountItems, ruleItems] = await Promise.all([
        listChannelAccounts(backendClient, { pluginCode: "goofish", pageSize: 50 }),
        listAutoReplyRules(backendClient, { pluginCode: "goofish", pageSize: 50 }),
      ]);
      setAccounts(accountItems as Array<{ id: string; displayName: string; connectionState?: string; enabled?: boolean }>);
      setRules(ruleItems as Array<{ id: string; matchPattern?: string; replyContent?: string; enabled?: boolean }>);
      if (!selectedAccountId && accountItems[0]?.id) {
        setSelectedAccountId(String(accountItems[0].id));
      }
      const activeId = selectedAccountId || String(accountItems[0]?.id ?? "");
      const selected = accountItems.find((item) => String(item?.id) === activeId);
      if (selected) {
        setAccountDisplayName(String(selected.displayName ?? ""));
        setAccountEnabled(Boolean(selected.enabled ?? true));
      }
      if (activeId) {
        const deliveryItems = await listAccountDeliveryBlockRules(backendClient, activeId);
        setDeliveryRules(
          deliveryItems as Array<{ ruleCode: string; ruleName: string; enabled: boolean; priority: number }>,
        );
      }
    } catch (cause: unknown) {
      setStatusMessage(cause instanceof Error ? cause.message : "Failed to load accounts");
    }
  }, [backendClient, hasSession, selectedAccountId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onCreateAccount = async () => {
    if (!session?.userId || !displayName.trim()) {
      setStatusMessage("Session userId and display name required.");
      return;
    }
    await createChannelAccount(backendClient, {
      pluginCode: "goofish",
      displayName: displayName.trim(),
      ownerUserId: session.userId,
    });
    setDisplayName("");
    await refresh();
    setStatusMessage("Account created.");
  };

  const onUpdateAccount = async () => {
    if (!selectedAccountId || !accountDisplayName.trim()) {
      return;
    }
    await updateChannelAccount(backendClient, selectedAccountId, {
      displayName: accountDisplayName.trim(),
      enabled: accountEnabled,
    });
    await refresh();
    setStatusMessage("Account updated.");
  };

  const onRuntime = async (action: "start" | "stop" | "status") => {
    if (!selectedAccountId) {
      return;
    }
    if (action === "start") {
      await startChannelAccountRuntime(backendClient, selectedAccountId);
    } else if (action === "stop") {
      await stopChannelAccountRuntime(backendClient, selectedAccountId);
    } else {
      const data = await getChannelAccountRuntimeStatus(backendClient, selectedAccountId);
      setStatusMessage(`Runtime: ${data?.connectionState ?? "unknown"}`);
      return;
    }
    await refresh();
    setStatusMessage(`Runtime ${action} ok.`);
  };

  const onCreateKeywordRule = async () => {
    if (!keywordPattern.trim() || !keywordReply.trim()) {
      setStatusMessage("Keyword pattern and reply required.");
      return;
    }
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
    setStatusMessage("Keyword rule created.");
  };

  const onSaveDeliveryRules = async () => {
    if (!selectedAccountId) {
      return;
    }
    await upsertAccountDeliveryBlockRules(backendClient, selectedAccountId, {
      pluginCode: "goofish",
      rules: deliveryRules.map((rule) => ({
        ruleCode: rule.ruleCode,
        enabled: rule.enabled,
        priority: rule.priority,
      })),
    });
    await refresh();
    setStatusMessage("Delivery rules saved.");
  };

  return (
    <section className="h5-channel-admin">
      <h2>Goofish operator</h2>
      {!hasSession ? (
        <p className="hint">Save operator session JSON in localStorage key sdkwork.customerservice.h5.operator.session</p>
      ) : null}
      <select
        value={selectedAccountId}
        onChange={(event) => setSelectedAccountId(event.target.value)}
        aria-label="Channel account"
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.displayName} ({account.connectionState ?? "disconnected"})
          </option>
        ))}
      </select>
      <div className="h5-actions">
        <input value={displayName} placeholder="New account name" onChange={(event) => setDisplayName(event.target.value)} />
        <button type="button" onClick={() => void onCreateAccount()} disabled={!hasSession}>
          Create
        </button>
        <button type="button" onClick={() => void refresh()} disabled={!hasSession}>
          Refresh
        </button>
      </div>
      <div className="h5-actions">
        <input value={accountDisplayName} placeholder="Account display name" onChange={(event) => setAccountDisplayName(event.target.value)} />
        <label>
          <input type="checkbox" checked={accountEnabled} onChange={(event) => setAccountEnabled(event.target.checked)} />
          Enabled
        </label>
        <button type="button" onClick={() => void onUpdateAccount()} disabled={!hasSession || !selectedAccountId}>
          Save account
        </button>
      </div>
      <div className="h5-actions">
        <button type="button" onClick={() => void onRuntime("start")} disabled={!hasSession}>
          Start
        </button>
        <button type="button" onClick={() => void onRuntime("stop")} disabled={!hasSession}>
          Stop
        </button>
        <button type="button" onClick={() => void onRuntime("status")} disabled={!hasSession}>
          Status
        </button>
      </div>
      <textarea
        rows={2}
        placeholder="Goofish cookie"
        value={cookiePayload}
        onChange={(event) => setCookiePayload(event.target.value)}
      />
      <button
        type="button"
        disabled={!hasSession || !selectedAccountId || !cookiePayload.trim()}
        onClick={() =>
          void registerChannelCredential(backendClient, selectedAccountId, {
            credentialKind: "cookie",
            payload: cookiePayload.trim(),
          }).then(() => setStatusMessage("Cookie registered."))
        }
      >
        Register cookie
      </button>
      <div className="h5-detail">
        <h3>Keyword auto-reply</h3>
        <input value={keywordPattern} placeholder="Match pattern" onChange={(event) => setKeywordPattern(event.target.value)} />
        <input value={keywordReply} placeholder="Reply content" onChange={(event) => setKeywordReply(event.target.value)} />
        <button type="button" disabled={!hasSession} onClick={() => void onCreateKeywordRule()}>
          Add keyword rule
        </button>
        <ul className="h5-list">
          {rules.map((rule) => (
            <li key={rule.id}>
              [{rule.enabled ? "on" : "off"}] {rule.matchPattern ?? "*"} → {rule.replyContent}{" "}
              <button
                type="button"
                onClick={() =>
                  void updateAutoReplyRule(backendClient, rule.id, { enabled: !rule.enabled }).then(() => refresh())
                }
              >
                Toggle
              </button>{" "}
              <button type="button" onClick={() => void deleteAutoReplyRule(backendClient, rule.id).then(() => refresh())}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="h5-detail">
        <h3>Delivery block rules</h3>
        <ul className="h5-list">
          {deliveryRules.map((rule) => (
            <li key={rule.ruleCode}>
              <label>
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() =>
                    setDeliveryRules((current) =>
                      current.map((entry) =>
                        entry.ruleCode === rule.ruleCode ? { ...entry, enabled: !entry.enabled } : entry,
                      ),
                    )
                  }
                />
                {rule.ruleName}
              </label>
            </li>
          ))}
        </ul>
        <button type="button" disabled={!hasSession || !selectedAccountId} onClick={() => void onSaveDeliveryRules()}>
          Save delivery rules
        </button>
      </div>
      {statusMessage ? <p className="hint">{statusMessage}</p> : null}
    </section>
  );
}
