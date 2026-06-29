import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("workspace declares sdkwork-web-framework and sdkwork-database deps", () => {
  const cargo = readFileSync(path.join(root, "Cargo.toml"), "utf8");
  assert.match(cargo, /sdkwork-web-core/);
  assert.match(cargo, /sdkwork-web-axum/);
  assert.match(cargo, /sdkwork-database-config/);
  assert.match(cargo, /sdkwork-database-lifecycle/);
  assert.match(cargo, /sdkwork_utils_rust/);
  assert.doesNotMatch(cargo, /sdkwork-discovery/);
});

test("tsconfig wires @sdkwork/utils", () => {
  const tsconfig = JSON.parse(readFileSync(path.join(root, "tsconfig.base.json"), "utf8"));
  assert.ok(tsconfig.compilerOptions.paths["@sdkwork/utils"]);
});

test("component spec declares communication customerservice capability", () => {
  const spec = JSON.parse(readFileSync(path.join(root, "specs/component.spec.json"), "utf8"));
  assert.equal(spec.component.domain, "communication");
  assert.equal(spec.component.capability, "customerservice");
});

test("AGENTS.md mandates sdkwork-drive for file uploads", () => {
  const agents = readFileSync(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /sdkwork-drive/);
});

test("sdkwork.app.config.json declares customerservice app key", () => {
  const manifest = JSON.parse(readFileSync(path.join(root, "sdkwork.app.config.json"), "utf8"));
  assert.equal(manifest.app.key, "sdkwork-customerservice");
  assert.equal(manifest.metadata.capability, "customerservice");
});

test("OpenAPI authorities align with route manifest", () => {
  const manifest = JSON.parse(
    readFileSync(
      path.join(
        root,
        "sdks/_route-manifests/app-api/sdkwork-customerservice-standalone-gateway.route-manifest.json",
      ),
      "utf8",
    ),
  );
  const appOpenapi = JSON.parse(
    readFileSync(
      path.join(root, "apis/app-api/communication/sdkwork-customerservice-app-api.openapi.json"),
      "utf8",
    ),
  );
  assert.equal(manifest.routes.length, 33);
  assert.equal(Object.keys(appOpenapi.paths ?? {}).length, 4);
  assert.ok(
    Object.keys(appOpenapi.paths ?? {}).every((routePath) => routePath.includes("customer_services")),
  );
});

test("generated TypeScript SDK families exist", () => {
  assert.ok(
    existsSync(
      path.join(
        root,
        "sdks/sdkwork-customerservice-backend-sdk/sdkwork-customerservice-backend-sdk-typescript/generated/server-openapi/src/index.ts",
      ),
    ),
  );
  assert.ok(
    existsSync(
      path.join(
        root,
        "sdks/sdkwork-customerservice-app-sdk/sdkwork-customerservice-app-sdk-typescript/generated/server-openapi/src/index.ts",
      ),
    ),
  );
  assert.ok(
    existsSync(
      path.join(
        root,
        "sdks/sdkwork-customerservice-internal-sdk/sdkwork-customerservice-internal-sdk-typescript/generated/server-openapi/src/index.ts",
      ),
    ),
  );
});

test("plugin system migration DDL exists", () => {
  assert.ok(
    existsSync(
      path.join(root, "database/ddl/migrations/postgres/0002_customerservice_plugin_system.sql"),
    ),
  );
});

test("deploy manifest and workflow contract exist", () => {
  assert.ok(readFileSync(path.join(root, "deployments/deploy.yaml"), "utf8").includes("cloud.split-services.production"));
  assert.ok(readFileSync(path.join(root, "sdkwork.workflow.json"), "utf8").includes("sdkwork-customerservice"));
});
