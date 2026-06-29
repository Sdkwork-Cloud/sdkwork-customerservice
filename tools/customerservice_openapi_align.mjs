#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const OPENAPI_FILES = [
  "apis/app-api/communication/sdkwork-customerservice-app-api.openapi.json",
  "apis/backend-api/communication/sdkwork-customerservice-backend-api.openapi.json",
  "apis/internal-api/communication/sdkwork-customerservice-internal-api.openapi.json",
];

/** Legacy pre-v3 wrappers incorrectly referenced as data.item payloads. */
const LEGACY_ITEM_WRAPPER_TO_DOMAIN = {
  TicketDetailResponse: "TicketDetail",
  TicketMessageResponse: "TicketMessage",
  TicketAttachmentResponse: "TicketAttachment",
  ChannelAccountResponse: "ChannelAccountSummary",
  AutoReplyRuleResponse: "AutoReplyRuleSummary",
  PluginEnablementResponse: "PluginEnablementSummary",
  AccountRuntimeStatusResponse: "AccountRuntimeStatus",
  SendPluginMessageResponse: "SendPluginMessageResult",
  DeliveryPreCheckResponse: "DeliveryPreCheckResult",
};

const LEGACY_SCHEMAS_TO_REMOVE = new Set([
  "TicketListResponse",
  "TicketMessageListResponse",
  "TicketAttachmentListResponse",
  "TicketDetailResponse",
  "TicketMessageResponse",
  "TicketAttachmentResponse",
  "ChannelAccountResponse",
  "AutoReplyRuleResponse",
  "DeleteAutoReplyRuleResponse",
  "PluginEnablementResponse",
  "RegisterChannelCredentialResponse",
  "AccountRuntimeStatusResponse",
  "SendPluginMessageResponse",
  "DeliveryPreCheckResponse",
]);

const COMMAND_RESPONSE_OPERATIONS = new Set([
  "customerservice.channels.admin.accounts.credentials.register",
]);

const INTERNAL_DOMAIN_SCHEMAS = {
  SendPluginMessageResult: {
    type: "object",
    additionalProperties: false,
    required: ["externalMessageId"],
    properties: {
      externalMessageId: { type: "string" },
    },
  },
  DeliveryPreCheckResult: {
    type: "object",
    additionalProperties: false,
    required: ["action"],
    properties: {
      action: {
        type: "string",
        enum: ["allow", "block", "card_only"],
      },
    },
  },
};

function replaceLegacyItemRefs(node) {
  if (Array.isArray(node)) {
    node.forEach(replaceLegacyItemRefs);
    return;
  }
  if (node == null || typeof node !== "object") {
    return;
  }

  if (typeof node.$ref === "string") {
    const match = node.$ref.match(/^#\/components\/schemas\/(.+)$/);
    if (match) {
      const replacement = LEGACY_ITEM_WRAPPER_TO_DOMAIN[match[1]];
      if (replacement) {
        node.$ref = `#/components/schemas/${replacement}`;
      }
    }
  }

  for (const value of Object.values(node)) {
    replaceLegacyItemRefs(value);
  }
}

function applyCommandResponseFix(openapi) {
  for (const pathItem of Object.values(openapi.paths ?? {})) {
    for (const operation of Object.values(pathItem ?? {})) {
      if (!operation || typeof operation !== "object" || !operation.operationId) {
        continue;
      }
      if (!COMMAND_RESPONSE_OPERATIONS.has(operation.operationId)) {
        continue;
      }
      operation.responses ??= {};
      operation.responses["200"] = {
        description: "Success",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SdkWorkCommandResponse" },
          },
        },
      };
    }
  }
}

function ensureInternalDomainSchemas(openapi, relativePath) {
  if (!relativePath.includes("internal-api")) {
    return;
  }
  openapi.components ??= {};
  openapi.components.schemas ??= {};
  Object.assign(openapi.components.schemas, INTERNAL_DOMAIN_SCHEMAS);
}

function collectSchemaRefs(node, refs = new Set()) {
  if (Array.isArray(node)) {
    node.forEach((entry) => collectSchemaRefs(entry, refs));
    return refs;
  }
  if (node == null || typeof node !== "object") {
    return refs;
  }
  if (typeof node.$ref === "string") {
    const match = node.$ref.match(/^#\/components\/schemas\/(.+)$/);
    if (match) {
      refs.add(match[1]);
    }
  }
  for (const value of Object.values(node)) {
    collectSchemaRefs(value, refs);
  }
  return refs;
}

function removeUnusedLegacySchemas(openapi) {
  const refs = collectSchemaRefs(openapi);
  const schemas = openapi.components?.schemas ?? {};
  for (const legacyName of LEGACY_SCHEMAS_TO_REMOVE) {
    if (!refs.has(legacyName) && legacyName in schemas) {
      delete schemas[legacyName];
    }
  }
}

for (const relativePath of OPENAPI_FILES) {
  const absolutePath = path.join(root, relativePath);
  const openapi = JSON.parse(readFileSync(absolutePath, "utf8"));
  ensureInternalDomainSchemas(openapi, relativePath);
  replaceLegacyItemRefs(openapi);
  applyCommandResponseFix(openapi);
  removeUnusedLegacySchemas(openapi);
  writeFileSync(absolutePath, `${JSON.stringify(openapi, null, 2)}\n`, "utf8");
  console.log(`aligned ${relativePath}`);
}
