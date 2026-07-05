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
  assert.ok(existsSync(path.join(root, ".github/workflows/package.yml")));
  const envExample = readFileSync(path.join(root, ".env.example"), "utf8");
  assert.match(envExample, /CUSTOMER_SERVICE_CREDENTIAL_MASTER_KEY/);
  assert.match(envExample, /SDKWORK_CUSTOMERSERVICE_INGRESS_TOKEN/);
  const techArch = readFileSync(path.join(root, "docs/architecture/tech/TECH_ARCHITECTURE.md"), "utf8");
  assert.match(techArch, /Launch readiness/);
  const runbook = readFileSync(path.join(root, "docs/runbooks/customerservice-operations.md"), "utf8");
  assert.match(runbook, /Pre-launch checklist/);
  assert.ok(existsSync(path.join(root, "tools/customerservice_gateway_smoke.mjs")));
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  assert.ok(pkg.scripts?.["smoke:gateway"]);
});

test("OpenAPI list responses use named page schemas for SDK typing", () => {
  const openapiPaths = [
    "apis/app-api/communication/sdkwork-customerservice-app-api.openapi.json",
    "apis/backend-api/communication/sdkwork-customerservice-backend-api.openapi.json",
  ];
  for (const relativePath of openapiPaths) {
    const openapi = JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
    for (const pathItem of Object.values(openapi.paths ?? {})) {
      for (const operation of Object.values(pathItem ?? {})) {
        if (!operation?.operationId || !operation.responses?.["200"]) {
          continue;
        }
        const schema = operation.responses["200"]?.content?.["application/json"]?.schema;
        if (!schema?.allOf) {
          continue;
        }
        const pageData = schema.allOf
          .map((part) => part?.properties?.data)
          .find((data) => data?.required?.includes("items") && data?.required?.includes("pageInfo"));
        if (pageData && !pageData.$ref) {
          assert.fail(`${relativePath} ${operation.operationId} still uses inline list page data`);
        }
      }
    }
  }
});

test("OpenAPI domain schemas declare required fields for TicketSummary", () => {
  const openapi = JSON.parse(
    readFileSync(
      path.join(root, "apis/backend-api/communication/sdkwork-customerservice-backend-api.openapi.json"),
      "utf8",
    ),
  );
  const ticketSummary = openapi.components?.schemas?.TicketSummary;
  assert.ok(ticketSummary?.required?.includes("id"));
  assert.ok(ticketSummary?.required?.includes("ticketNo"));
  assert.equal(ticketSummary?.additionalProperties, false);
});

test("OpenAPI page data schemas reference PageInfo instead of inline objects", () => {
  const openapi = JSON.parse(
    readFileSync(
      path.join(root, "apis/app-api/communication/sdkwork-customerservice-app-api.openapi.json"),
      "utf8",
    ),
  );
  const pageData = openapi.components?.schemas?.CustomerserviceTicketsListPageData;
  assert.equal(pageData?.properties?.pageInfo?.$ref, "#/components/schemas/PageInfo");
});

test("shared client-core package lives under apps/sdkwork-customerservice-common", () => {
  assert.ok(
    existsSync(
      path.join(
        root,
        "apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core/src/index.ts",
      ),
    ),
  );
});

test("contracts package re-exports generated SDK domain types", () => {
  const contracts = readFileSync(
    path.join(root, "apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-contracts/src/index.ts"),
    "utf8",
  );
  assert.match(contracts, /sdkwork-customerservice-backend-sdk-generated-typescript/);
  assert.match(contracts, /sdkwork-customerservice-app-sdk-generated-typescript/);
  assert.match(contracts, /TICKET_STATUS_OPTIONS/);
  assert.match(contracts, /TICKET_PRIORITY_OPTIONS/);
  assert.doesNotMatch(contracts, /interface TicketSummary/);
});
