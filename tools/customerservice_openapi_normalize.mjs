#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sdkWorkEnvelopeComponentSchemas } from "../../sdkwork-specs/tools/lib/openapi-envelope-schemas.mjs";
import { HTTP_METHODS } from "./customerservice_openapi_shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  {
    relativePath:
      "apis/app-api/communication/sdkwork-customerservice-app-api.openapi.json",
    operationSecurity: [{ AuthToken: [], AccessToken: [] }],
  },
  {
    relativePath:
      "apis/backend-api/communication/sdkwork-customerservice-backend-api.openapi.json",
    operationSecurity: [{ AuthToken: [], AccessToken: [] }],
  },
  {
    relativePath:
      "apis/internal-api/communication/sdkwork-customerservice-internal-api.openapi.json",
    operationSecurity: [{ ApiKey: [] }],
  },
];

function normalizeOpenapi(openapi, operationSecurity) {
  const nextPaths = {};
  for (const [pathKey, pathItem] of Object.entries(openapi.paths ?? {})) {
    const normalizedPath = pathKey.replaceAll("customer-services", "customer_services");
    const nextPathItem = { ...pathItem };
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!HTTP_METHODS.has(method) || !operation || typeof operation !== "object") {
        continue;
      }
      nextPathItem[method] = {
        ...operation,
        security: operationSecurity,
      };
    }
    nextPaths[normalizedPath] = nextPathItem;
  }
  openapi.paths = nextPaths;
  openapi.components ??= {};
  openapi.components.schemas ??= {};
  Object.assign(openapi.components.schemas, structuredClone(sdkWorkEnvelopeComponentSchemas));
  return openapi;
}

for (const { relativePath, operationSecurity } of files) {
  const absolutePath = path.join(root, relativePath);
  const openapi = normalizeOpenapi(
    JSON.parse(readFileSync(absolutePath, "utf8")),
    operationSecurity,
  );
  writeFileSync(absolutePath, `${JSON.stringify(openapi, null, 2)}\n`, "utf8");
  console.log(`normalized ${relativePath}`);
}
