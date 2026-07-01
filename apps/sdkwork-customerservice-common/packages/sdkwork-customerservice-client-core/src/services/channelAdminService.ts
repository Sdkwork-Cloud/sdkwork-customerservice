import type {
  AccountRuntimeStatus,
  AutoReplyRuleSummary,
  ChannelAccountSummary,
  DeliveryBlockRuleCatalogEntry,
  DeliveryBlockRuleSummary,
  SdkWorkCommandData,
} from "sdkwork-customerservice-backend-sdk-generated-typescript";
import type { SdkworkBackendClient } from "sdkwork-customerservice-backend-sdk-generated-typescript";

function channelsAdmin(client: SdkworkBackendClient) {
  return client.customerServiceChannelsAdmin.customerservice.channels.admin;
}

export async function listChannelAccounts(
  client: SdkworkBackendClient,
  params?: { pluginCode?: string; page?: number; pageSize?: number },
): Promise<ChannelAccountSummary[]> {
  const page = await channelsAdmin(client).accounts.list(params);
  return page.items;
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
): Promise<ChannelAccountSummary> {
  return channelsAdmin(client).accounts.create(body);
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
  const page = await channelsAdmin(client).autoReplyRules.list(params);
  return page.items;
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
): Promise<AutoReplyRuleSummary> {
  return channelsAdmin(client).autoReplyRules.create(body);
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
): Promise<AutoReplyRuleSummary> {
  return channelsAdmin(client).autoReplyRules.update(ruleId, body);
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
): Promise<ChannelAccountSummary> {
  return channelsAdmin(client).accounts.update(accountId, body);
}

export async function startChannelAccountRuntime(
  client: SdkworkBackendClient,
  accountId: string,
): Promise<AccountRuntimeStatus> {
  return channelsAdmin(client).accounts.runtime.start(accountId);
}

export async function stopChannelAccountRuntime(
  client: SdkworkBackendClient,
  accountId: string,
): Promise<AccountRuntimeStatus> {
  return channelsAdmin(client).accounts.runtime.stop(accountId);
}

export async function getChannelAccountRuntimeStatus(
  client: SdkworkBackendClient,
  accountId: string,
): Promise<AccountRuntimeStatus> {
  return channelsAdmin(client).accounts.runtime.status(accountId);
}

export async function listDeliveryBlockRuleCatalog(
  client: SdkworkBackendClient,
  pluginCode: string,
): Promise<DeliveryBlockRuleCatalogEntry[]> {
  const page = await channelsAdmin(client).deliveryBlockRules.catalog({ pluginCode });
  return page.items;
}

export async function listAccountDeliveryBlockRules(
  client: SdkworkBackendClient,
  accountId: string,
): Promise<DeliveryBlockRuleSummary[]> {
  const page = await channelsAdmin(client).deliveryBlockRules.list(accountId);
  return page.items;
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
  const page = await channelsAdmin(client).deliveryBlockRules.upsert(accountId, body);
  return page.items;
}
