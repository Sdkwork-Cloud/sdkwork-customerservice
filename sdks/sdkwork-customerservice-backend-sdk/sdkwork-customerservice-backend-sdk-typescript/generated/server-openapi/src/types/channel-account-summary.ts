export interface ChannelAccountSummary {
  id: string;
  tenantId: string;
  organizationId?: string;
  pluginCode: string;
  externalAccountId?: string | null;
  displayName: string;
  status: string;
  enabled: boolean;
  ownerUserId: string;
  connectionState?: string | null;
  createdAt: string;
  updatedAt: string;
}
