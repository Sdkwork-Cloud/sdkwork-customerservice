#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DOMAIN_SCHEMA_REQUIREMENTS,
  TICKET_DETAIL_NULLABLE_OPTIONAL,
} from "./customerservice_openapi_domain.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

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
  "PluginCatalogListResponse",
  "ChannelAccountListResponse",
  "AutoReplyRuleListResponse",
  "DeliveryBlockRuleCatalogListResponse",
  "DeliveryBlockRuleListResponse",
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

const SUCCESS_STATUS_CODES = ["200", "201"];

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function operationIdToSchemaPrefix(operationId) {
  return operationId
    .split(".")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

function isSdkWorkApiResponseRef(node) {
  return node?.$ref === "#/components/schemas/SdkWorkApiResponse";
}

function withNullableType(propertySchema) {
  if (!propertySchema || typeof propertySchema !== "object") {
    return propertySchema;
  }
  if (propertySchema.nullable === true) {
    return propertySchema;
  }
  const type = propertySchema.type;
  if (typeof type === "string") {
    return { ...propertySchema, type: [type, "null"] };
  }
  if (Array.isArray(type) && type.includes("null")) {
    return propertySchema;
  }
  return propertySchema;
}

function applyDomainSchemaRequirements(openapi) {
  openapi.components ??= {};
  openapi.components.schemas ??= {};
  const schemas = openapi.components.schemas;

  for (const [schemaName, rules] of Object.entries(DOMAIN_SCHEMA_REQUIREMENTS)) {
    const schema = schemas[schemaName];
    if (!schema || typeof schema !== "object" || schema.allOf || schema.$ref) {
      continue;
    }
    schema.additionalProperties = false;
    schema.required = [...rules.required];
    for (const propertyName of rules.nullableOptional ?? []) {
      if (schema.properties?.[propertyName]) {
        schema.properties[propertyName] = withNullableType(schema.properties[propertyName]);
      }
    }
  }

  const ticketDetail = schemas.TicketDetail;
  if (ticketDetail?.allOf) {
    for (const part of ticketDetail.allOf) {
      if (!part?.properties) {
        continue;
      }
      part.additionalProperties = false;
      for (const propertyName of TICKET_DETAIL_NULLABLE_OPTIONAL) {
        if (part.properties[propertyName]) {
          part.properties[propertyName] = withNullableType(part.properties[propertyName]);
        }
      }
    }
  }
}

function extractInlinePageData(schema) {
  if (!schema?.allOf || !Array.isArray(schema.allOf)) {
    return null;
  }
  if (!schema.allOf.some(isSdkWorkApiResponseRef)) {
    return null;
  }
  for (const part of schema.allOf) {
    const data = part?.properties?.data;
    if (!data || typeof data !== "object" || data.$ref) {
      continue;
    }
    const required = new Set(data.required ?? []);
    if (required.has("items") && required.has("pageInfo")) {
      return cloneJson(data);
    }
  }
  return null;
}

function extractInlineResourceData(schema) {
  if (!schema?.allOf || !Array.isArray(schema.allOf)) {
    return null;
  }
  if (!schema.allOf.some(isSdkWorkApiResponseRef)) {
    return null;
  }
  for (const part of schema.allOf) {
    const data = part?.properties?.data;
    if (!data || typeof data !== "object" || data.$ref) {
      continue;
    }
    const required = new Set(data.required ?? []);
    if (required.has("item") && data.properties?.item) {
      return cloneJson(data);
    }
  }
  return null;
}

function materializeInlineEnvelopeResponses(openapi) {
  openapi.components ??= {};
  openapi.components.schemas ??= {};
  const schemas = openapi.components.schemas;

  for (const pathItem of Object.values(openapi.paths ?? {})) {
    for (const operation of Object.values(pathItem ?? {})) {
      if (!operation || typeof operation !== "object" || !operation.operationId) {
        continue;
      }
      const prefix = operationIdToSchemaPrefix(operation.operationId);

      for (const statusCode of SUCCESS_STATUS_CODES) {
        const response = operation.responses?.[statusCode];
        const responseSchema = response?.content?.["application/json"]?.schema;
        if (!responseSchema || responseSchema.$ref) {
          continue;
        }

        const pageData = extractInlinePageData(responseSchema);
        if (pageData) {
          const pageDataName = `${prefix}PageData`;
          const responseName = `${prefix}Response`;
          if (!(pageDataName in schemas)) {
            schemas[pageDataName] = pageData;
          }
          if (!(responseName in schemas)) {
            schemas[responseName] = {
              allOf: [
                { $ref: "#/components/schemas/SdkWorkApiResponse" },
                {
                  type: "object",
                  required: ["data"],
                  properties: {
                    data: { $ref: `#/components/schemas/${pageDataName}` },
                  },
                },
              ],
            };
          }
          response.content["application/json"].schema = {
            $ref: `#/components/schemas/${responseName}`,
          };
          continue;
        }

        const resourceData = extractInlineResourceData(responseSchema);
        if (!resourceData) {
          continue;
        }

        const resourceDataName = `${prefix}ResourceData`;
        const responseName = `${prefix}Response`;
        if (!(resourceDataName in schemas)) {
          schemas[resourceDataName] = resourceData;
        }
        if (!(responseName in schemas)) {
          schemas[responseName] = {
            allOf: [
              { $ref: "#/components/schemas/SdkWorkApiResponse" },
              {
                type: "object",
                required: ["data"],
                properties: {
                  data: { $ref: `#/components/schemas/${resourceDataName}` },
                },
              },
            ],
          };
        }
        response.content["application/json"].schema = {
          $ref: `#/components/schemas/${responseName}`,
        };
      }
    }
  }
}

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

function normalizePageInfoRefs(openapi) {
  const schemas = openapi.components?.schemas ?? {};
  for (const schema of Object.values(schemas)) {
    if (!schema?.properties?.pageInfo || schema.properties.pageInfo.$ref) {
      continue;
    }
    if (schema.properties.pageInfo.type === "object") {
      schema.properties.pageInfo = { $ref: "#/components/schemas/PageInfo" };
    }
  }
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

function alignOpenapi(openapi, relativePath) {
  ensureInternalDomainSchemas(openapi, relativePath);
  replaceLegacyItemRefs(openapi);
  materializeInlineEnvelopeResponses(openapi);
  applyCommandResponseFix(openapi);
  applyDomainSchemaRequirements(openapi);
  normalizePageInfoRefs(openapi);
  removeUnusedLegacySchemas(openapi);
  return openapi;
}

let failed = false;

for (const relativePath of OPENAPI_FILES) {
  const absolutePath = path.join(root, relativePath);
  const original = readFileSync(absolutePath, "utf8");
  const openapi = alignOpenapi(JSON.parse(original), relativePath);
  const next = `${JSON.stringify(openapi, null, 2)}\n`;

  if (checkOnly) {
    if (next !== original) {
      console.error(`[customerservice_openapi_align] misaligned ${relativePath}; run pnpm api:materialize`);
      failed = true;
    } else {
      console.log(`aligned (check ok) ${relativePath}`);
    }
    continue;
  }

  writeFileSync(absolutePath, next, "utf8");
  console.log(`aligned ${relativePath}`);
}

if (failed) {
  process.exit(1);
}
