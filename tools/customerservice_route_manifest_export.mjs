#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  root,
  "sdks/_route-manifests/app-api/sdkwork-customerservice-standalone-gateway.route-manifest.json",
);

const checkOnly = process.argv.includes("--check");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

if (manifest.kind !== "sdkwork.route-manifest") {
  console.error("invalid route manifest kind");
  process.exit(1);
}

for (const route of manifest.routes ?? []) {
  if (!route.requestContext || !route.apiSurface || !route.operationId) {
    console.error(`invalid route entry: ${JSON.stringify(route)}`);
    process.exit(1);
  }
}

if (checkOnly) {
  console.log(`route manifest ok (${manifest.routes.length} routes)`);
} else {
  console.log(`route manifest export ok (${manifest.routes.length} routes)`);
}
