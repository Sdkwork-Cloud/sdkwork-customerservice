#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  OPENAPI_AUTHORITIES,
  collectOperations,
  operationKey,
} from "./customerservice_openapi_shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const manifestPath = path.join(
  root,
  "sdks/_route-manifests/app-api/sdkwork-customerservice-standalone-gateway.route-manifest.json",
);

function fail(message) {
  console.error(`[customerservice_openapi_export] ${message}`);
  process.exit(1);
}

function resolveRoot(relativePath) {
  return path.resolve(root, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolveRoot(relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  const absolutePath = resolveRoot(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function routesForAuthority(manifest, authority) {
  return (manifest.routes ?? []).filter((route) => {
    if (route.apiSurface === authority.apiSurface) {
      return true;
    }
    return route.path?.startsWith(authority.apiPrefix);
  });
}

function validateAuthority(manifest, authority) {
  const sourcePath = resolveRoot(authority.sourceOpenapi);
  if (!existsSync(sourcePath)) {
    fail(`missing authored OpenAPI: ${authority.sourceOpenapi}`);
  }

  const openapi = readJson(authority.sourceOpenapi);
  if (openapi.openapi !== "3.1.2") {
    fail(`${authority.sourceOpenapi} must declare openapi 3.1.2`);
  }
  if (openapi.info?.["x-sdkwork-api-authority"] !== authority.authorityName) {
    fail(`${authority.sourceOpenapi} authority metadata mismatch`);
  }
  if (openapi.info?.["x-sdkwork-sdk-family"] !== authority.familyName) {
    fail(`${authority.sourceOpenapi} SDK family metadata mismatch`);
  }

  const manifestRoutes = routesForAuthority(manifest, authority);
  const openapiOperations = collectOperations(openapi);
  const manifestKeys = new Set(
    manifestRoutes.map((route) => `${route.method} ${route.path} ${route.operationId}`),
  );
  const openapiKeys = new Set(openapiOperations.map(operationKey));

  for (const route of manifestRoutes) {
    const key = `${route.method} ${route.path} ${route.operationId}`;
    if (!openapiKeys.has(key)) {
      fail(`OpenAPI missing route manifest operation: ${key}`);
    }
  }

  for (const operation of openapiOperations) {
    const key = operationKey(operation);
    if (!manifestKeys.has(key)) {
      fail(`OpenAPI operation not declared in route manifest: ${key}`);
    }
    if (!operation.path.startsWith(authority.apiPrefix)) {
      fail(`${operation.operationId} path must start with ${authority.apiPrefix}`);
    }
  }

  if (!checkOnly) {
    writeJson(authority.sdkOpenapi, openapi);
    writeJson(authority.sdkgenOpenapi, openapi);
  } else if (!existsSync(resolveRoot(authority.sdkOpenapi))) {
    fail(`missing SDK authority OpenAPI: ${authority.sdkOpenapi}`);
  } else if (!existsSync(resolveRoot(authority.sdkgenOpenapi))) {
    fail(`missing SDK sdkgen OpenAPI: ${authority.sdkgenOpenapi}`);
  }

  return manifestRoutes.length;
}

const manifest = readJson(manifestPath);
if (manifest.kind !== "sdkwork.route-manifest") {
  fail("route manifest kind must be sdkwork.route-manifest");
}

let routeCount = 0;
for (const authority of OPENAPI_AUTHORITIES) {
  routeCount += validateAuthority(manifest, authority);
}

console.log(
  checkOnly
    ? `[customerservice_openapi_export] check ok (${routeCount} authority routes)`
    : `[customerservice_openapi_export] materialized ${OPENAPI_AUTHORITIES.length} authority OpenAPI files`,
);
