import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("database manifest follows sdkwork-database module shape", () => {
  const manifest = JSON.parse(readFileSync(path.join(root, "database/database.manifest.json"), "utf8"));
  assert.equal(manifest.kind, "sdkwork.database.module");
  assert.equal(manifest.moduleId, "customerservice");
  assert.equal(manifest.tablePrefix, "communication_");
  assert.equal(manifest.serviceCode, "CUSTOMER_SERVICE");
});

test("route manifest covers app and backend customer-service surfaces", () => {
  const manifest = JSON.parse(
    readFileSync(
      path.join(
        root,
        "sdks/_route-manifests/app-api/sdkwork-customerservice-standalone-gateway.route-manifest.json",
      ),
      "utf8",
    ),
  );
  assert.ok(manifest.routes.some((route) => route.apiSurface === "app-api"));
  assert.ok(manifest.routes.some((route) => route.apiSurface === "backend-api"));
});
