export interface SendPluginMessageRequest {
  externalConversationId: string;
  externalRecipientId?: string;
  body: string;
}
