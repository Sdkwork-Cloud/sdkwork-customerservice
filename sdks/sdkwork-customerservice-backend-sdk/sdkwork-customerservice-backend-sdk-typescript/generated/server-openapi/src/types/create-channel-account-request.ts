export interface CreateChannelAccountRequest {
  pluginCode: string;
  displayName: string;
  ownerUserId: string;
  organizationId?: string;
  externalAccountId?: string;
}
