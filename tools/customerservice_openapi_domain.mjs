/** Domain schema required/nullable rules aligned with Rust service domain types. */
export const DOMAIN_SCHEMA_REQUIREMENTS = {
  TicketSummary: {
    required: [
      "id",
      "ticketNo",
      "subject",
      "status",
      "priority",
      "channel",
      "requesterUserId",
      "createdAt",
      "updatedAt",
    ],
    nullableOptional: ["assigneeUserId"],
  },
  TicketMessage: {
    required: ["id", "ticketId", "authorUserId", "authorRole", "body", "createdAt"],
  },
  TicketAttachment: {
    required: ["id", "ticketId", "driveNodeId", "fileName", "uploadedByUserId", "createdAt"],
    nullableOptional: ["contentType", "sizeBytes"],
  },
  PluginCatalogEntry: {
    required: [
      "id",
      "pluginCode",
      "displayName",
      "version",
      "capabilities",
      "status",
      "createdAt",
      "updatedAt",
    ],
    nullableOptional: ["tenantEnabled"],
  },
  PluginEnablementSummary: {
    required: ["id", "tenantId", "pluginCode", "enabled", "config", "createdAt", "updatedAt"],
  },
  ChannelAccountSummary: {
    required: [
      "id",
      "tenantId",
      "pluginCode",
      "displayName",
      "status",
      "enabled",
      "ownerUserId",
      "createdAt",
      "updatedAt",
    ],
    nullableOptional: ["organizationId", "externalAccountId", "connectionState"],
  },
  AutoReplyRuleSummary: {
    required: [
      "id",
      "tenantId",
      "pluginCode",
      "ruleKind",
      "priority",
      "enabled",
      "createdAt",
      "updatedAt",
    ],
    nullableOptional: ["accountId", "matchPattern", "replyContent"],
  },
  DeliveryBlockRuleCatalogEntry: {
    required: ["ruleCode", "ruleName", "ruleDescription", "defaultPriority", "defaultActionConfig"],
  },
  DeliveryBlockRuleSummary: {
    required: [
      "ruleCode",
      "ruleName",
      "ruleDescription",
      "enabled",
      "priority",
      "excludedExternalItemIds",
      "actionConfig",
      "defaultActionConfig",
    ],
    nullableOptional: ["id"],
  },
  AccountRuntimeStatus: {
    required: ["accountId", "pluginCode", "connectionState", "workerActive"],
  },
  SendPluginMessageResult: {
    required: ["externalMessageId"],
  },
  DeliveryPreCheckResult: {
    required: ["action"],
  },
};

export const TICKET_DETAIL_NULLABLE_OPTIONAL = ["organizationId", "closedAt"];
