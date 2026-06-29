import type {
  AccountRuntimeStatus,
  AutoReplyRuleSummary,
  ChannelAccountSummary,
  DeliveryBlockRuleSummary,
  SdkWorkCommandData,
} from "sdkwork-customerservice-backend-sdk-generated-typescript";
import type { SdkworkBackendClient } from "sdkwork-customerservice-backend-sdk-generated-typescript";

import { unwrapSdkListItems, unwrapSdkPayload } from "../utils/unwrapSdkPayload";

function channelsAdmin(client: SdkworkBackendClient) {
  return client.customerServiceChannelsAdmin.customerservice.channels.admin;
}

export async function listChannelAccounts(
  client: SdkworkBackendClient,
  params?: { pluginCode?: string; page?: number; pageSize?: number },
): Promise<ChannelAccountSummary[]> {
  const response = await channelsAdmin(client).accounts.list(params);
  return unwrapSdkListItems<ChannelAccountSummary>(response);
}

export async function createChannelAccount(
  client: SdkworkBackendClient,
  body: {
    pluginCode: string;
    displayName: string;
    ownerUserId: string;
    organizationId?: string;
    externalAccountId?: string;
  },
): Promise<ChannelAccountSummary | undefined> {
  const response = await channelsAdmin(client).accounts.create(body);
  return unwrapSdkPayload<ChannelAccountSummary>(response);
}

export async function registerChannelCredential(
  client: SdkworkBackendClient,
  accountId: string,
  body: { credentialKind: string; payload: string },
): Promise<SdkWorkCommandData> {
  return channelsAdmin(client).accounts.credentials.register(accountId, body);
}

export async function listAutoReplyRules(
  client: SdkworkBackendClient,
  params?: {
    pluginCode?: string;
    accountId?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<AutoReplyRuleSummary[]> {
  const response = await channelsAdmin(client).autoReplyRules.list(params);
  return unwrapSdkListItems<AutoReplyRuleSummary>(response);
}

export async function createAutoReplyRule(
  client: SdkworkBackendClient,
  body: {
    pluginCode: string;
    ruleKind: string;
    replyContent: string;
    accountId?: string;
    priority?: number;
    enabled?: boolean;
    matchPattern?: string;
  },
): Promise<AutoReplyRuleSummary | undefined> {
  const response = await channelsAdmin(client).autoReplyRules.create(body);
  return unwrapSdkPayload<AutoReplyRuleSummary>(response);
}

export async function updateAutoReplyRule(
  client: SdkworkBackendClient,
  ruleId: string,
  body: {
    priority?: number;
    enabled?: boolean;
    matchPattern?: string;
    replyContent?: string;
  },
): Promise<AutoReplyRuleSummary | undefined> {
  const response = await channelsAdmin(client).autoReplyRules.update(ruleId, body);
  return unwrapSdkPayload<AutoReplyRuleSummary>(response);
}

export async function deleteAutoReplyRule(
  client: SdkworkBackendClient,
  ruleId: string,
): Promise<SdkWorkCommandData> {
  return channelsAdmin(client).autoReplyRules.delete(ruleId);
}

export async function updateChannelAccount(
  client: SdkworkBackendClient,
  accountId: string,
  body: {
    displayName?: string;
    enabled?: boolean;
    status?: string;
  },
): Promise<ChannelAccountSummary | undefined> {
  const response = await channelsAdmin(client).accounts.update(accountId, body);
  return unwrapSdkPayload<ChannelAccountSummary>(response);
}

export async function startChannelAccountRuntime(
  client: SdkworkBackendClient,
  accountId: string,
): Promise<AccountRuntimeStatus | undefined> {
  const response = await channelsAdmin(client).accounts.runtime.start(accountId);
  return unwrapSdkPayload<AccountRuntimeStatus>(response);
}

export async function stopChannelAccountRuntime(
  client: SdkworkBackendClient,
  accountId: string,
): Promise<AccountRuntimeStatus | undefined> {
  const response = await channelsAdmin(client).accounts.runtime.stop(accountId);
  return unwrapSdkPayload<AccountRuntimeStatus>(response);
}

export async function getChannelAccountRuntimeStatus(
  client: SdkworkBackendClient,
  accountId: string,
): Promise<AccountRuntimeStatus | undefined> {
  const response = await channelsAdmin(client).accounts.runtime.status(accountId);
  return unwrapSdkPayload<AccountRuntimeStatus>(response);
}

export async function listDeliveryBlockRuleCatalog(
  client: SdkworkBackendClient,
  pluginCode: string,
) {
  const response = await channelsAdmin(client).deliveryBlockRules.catalog({ pluginCode });
  return unwrapSdkListItems(response);
}

export async function listAccountDeliveryBlockRules(
  client: SdkworkBackendClient,
  accountId: string,
): Promise<DeliveryBlockRuleSummary[]> {
  const response = await channelsAdmin(client).deliveryBlockRules.list(accountId);
  return unwrapSdkListItems<DeliveryBlockRuleSummary>(response);
}

export async function upsertAccountDeliveryBlockRules(
  client: SdkworkBackendClient,
  accountId: string,
  body: {
    pluginCode: string;
    rules: Array<{
      ruleCode: string;
      enabled: boolean;
      priority: number;
      excludedExternalItemIds?: string[];
      actionConfig?: Record<string, unknown>;
    }>;
  },
): Promise<DeliveryBlockRuleSummary[]> {
  const response = await channelsAdmin(client).deliveryBlockRules.upsert(accountId, body);
  return unwrapSdkListItems<DeliveryBlockRuleSummary>(response);
}
