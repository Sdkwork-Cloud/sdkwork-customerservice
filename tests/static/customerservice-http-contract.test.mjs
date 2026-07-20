import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("app routes use requester-scoped ticket retrieval", () => {
  const source = readFileSync(
    path.join(repoRoot, "crates/sdkwork-routes-customerservice-app-api/src/app_routes.rs"),
    "utf8",
  );
  assert.match(source, /retrieve_ticket_for_requester/);
  assert.doesNotMatch(source, /\.retrieve_ticket\(/);
});

test("app response module includes HTTP envelope contract tests", () => {
  const source = readFileSync(
    path.join(repoRoot, "crates/sdkwork-routes-customerservice-app-api/src/response.rs"),
    "utf8",
  );
  assert.match(source, /unauthorized_returns_problem_detail_with_trace_id/);
  assert.match(source, /success_resource_envelope_uses_code_zero_and_item_payload/);
});

test("internal ingress auth includes middleware contract tests", () => {
  const source = readFileSync(
    path.join(repoRoot, "crates/sdkwork-routes-customerservice-internal-api/src/ingress_auth.rs"),
    "utf8",
  );
  assert.match(source, /ingress_auth_contract/);
  assert.match(source, /secure_compare/);
});

test("app routes include HTTP integration tests with memory repository", () => {
  const libSource = readFileSync(
    path.join(repoRoot, "crates/sdkwork-routes-customerservice-app-api/src/lib.rs"),
    "utf8",
  );
  const testSource = readFileSync(
    path.join(
      repoRoot,
      "crates/sdkwork-routes-customerservice-app-api/src/http_integration_tests.rs",
    ),
    "utf8",
  );
  assert.match(libSource, /mod http_integration_tests/);
  assert.match(testSource, /MemoryTicketRepository/);
  assert.match(testSource, /retrieve_ticket_hides_ticket_from_other_requester/);
  assert.match(testSource, /missing_iam_context_returns_401_problem_detail/);
});

test("topology profile env files align with profile id axis", () => {
  const spec = JSON.parse(
    readFileSync(path.join(repoRoot, "specs/topology.spec.json"), "utf8"),
  );
  for (const [profileId, relativePath] of Object.entries(spec.profileFiles)) {
    const envText = readFileSync(path.join(repoRoot, relativePath), "utf8");
    assert.match(
      envText,
      new RegExp(`SDKWORK_CUSTOMER_SERVICE_PROFILE_ID=${profileId.replace(/\./g, "\\.")}`),
      `profile id mismatch in ${relativePath}`,
    );
  }
});

test("gateway uses env-filter tracing bootstrap", () => {
  const source = readFileSync(
    path.join(repoRoot, "crates/sdkwork-api-customerservice-standalone-gateway/src/main.rs"),
    "utf8",
  );
  assert.match(source, /EnvFilter::try_from_default_env/);
});

test("gateway assembly includes infra and memory app integration tests", () => {
  const source = readFileSync(
    path.join(
      repoRoot,
      "crates/sdkwork-api-customerservice-assembly/tests/gateway_infra_contract.rs",
    ),
    "utf8",
  );
  assert.match(source, /gateway_exposes_health_ready_and_metrics/);
  assert.match(source, /gateway_mounts_memory_app_surface_with_sdkwork_envelope/);
  assert.match(source, /assemble_multi_surface_router/);
});

test("backend response module includes HTTP envelope contract tests", () => {
  const source = readFileSync(
    path.join(repoRoot, "crates/sdkwork-routes-customerservice-backend-api/src/response.rs"),
    "utf8",
  );
  assert.match(source, /unauthorized_returns_problem_detail_with_trace_id/);
  assert.match(source, /success_resource_envelope_uses_code_zero_and_item_payload/);
});

test("backend routes include HTTP integration tests with memory repository", () => {
  const libSource = readFileSync(
    path.join(repoRoot, "crates/sdkwork-routes-customerservice-backend-api/src/lib.rs"),
    "utf8",
  );
  const testSource = readFileSync(
    path.join(
      repoRoot,
      "crates/sdkwork-routes-customerservice-backend-api/src/http_integration_tests.rs",
    ),
    "utf8",
  );
  const routesSource = readFileSync(
    path.join(repoRoot, "crates/sdkwork-routes-customerservice-backend-api/src/backend_routes.rs"),
    "utf8",
  );
  assert.match(libSource, /mod http_integration_tests/);
  assert.match(testSource, /MemoryTicketRepository/);
  assert.match(testSource, /list_admin_tickets_returns_sdkwork_page_envelope/);
  assert.match(routesSource, /BackendTicketAdminPort/);
  assert.match(routesSource, /backend_router_core/);
});

test("postgres repository integration tests are defined", () => {
  const repoSource = readFileSync(
    path.join(
      repoRoot,
      "crates/sdkwork-communication-customerservice-repository-sqlx/tests/postgres_ticket_repository.rs",
    ),
    "utf8",
  );
  assert.match(repoSource, /postgres_retrieve_ticket_isolates_requester/);
  assert.match(repoSource, /postgres_retrieve_ticket_isolates_tenant/);
  const httpSource = readFileSync(
    path.join(
      repoRoot,
      "crates/sdkwork-api-customerservice-assembly/tests/postgres_http_integration.rs",
    ),
    "utf8",
  );
  assert.match(httpSource, /postgres_gateway_create_ticket_returns_sdkwork_envelope/);
  assert.match(httpSource, /postgres_gateway_retrieve_hides_ticket_from_other_requester/);
  assert.match(httpSource, /postgres_gateway_backend_list_and_retrieve_ticket/);
  assert.match(httpSource, /postgres_gateway_backend_retrieve_hides_ticket_from_other_tenant/);
  assert.match(httpSource, /postgres_gateway_internal_missing_ingress_token_returns_401/);
  assert.match(httpSource, /postgres_gateway_internal_valid_ingress_requires_tenant_header/);
  assert.match(httpSource, /postgres_gateway_internal_valid_ingress_and_tenant_reaches_service_layer/);
  assert.match(httpSource, /assemble_api_router/);
  const bootstrapSource = readFileSync(
    path.join(
      repoRoot,
      "crates/sdkwork-customerservice-database-host/src/testing/postgres_integration.rs",
    ),
    "utf8",
  );
  assert.match(bootstrapSource, /try_bootstrap_database_host/);
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.match(pkg.scripts["test:postgres"], /--ignored/);
  assert.match(pkg.scripts["test:postgres"], /postgres_http_integration/);
  assert.match(pkg.scripts["test:postgres:required"], /customerservice_postgres_test_required/);
});

test("governance workflow runs postgres integration job", () => {
  const source = readFileSync(
    path.join(repoRoot, ".github/workflows/governance.yml"),
    "utf8",
  );
  assert.match(source, /postgres-integration:/);
  assert.match(source, /image: postgres:16/);
  assert.match(source, /pnpm db:bootstrap/);
  assert.match(source, /pnpm test:postgres/);
  assert.match(source, /workflow:prepare-ci-dependencies/);
});

test("CI materializes sibling SDKWork repositories from sdkwork.workflow.json", () => {
  assert.ok(
    existsSync(path.join(repoRoot, "scripts/prepare-ci-dependencies.mjs")),
    "scripts/prepare-ci-dependencies.mjs must exist",
  );
  const materializer = readFileSync(
    path.join(repoRoot, "scripts/prepare-ci-dependencies.mjs"),
    "utf8",
  );
  assert.match(materializer, /sdkwork\.workflow\.json/);
  assert.match(materializer, /path\.resolve\(repoRoot, '\.\.'\)/);
  assert.match(materializer, /tokenSecret/);
  const workflow = JSON.parse(readFileSync(path.join(repoRoot, "sdkwork.workflow.json"), "utf8"));
  const dependencyIds = (workflow.dependencies ?? []).map((dependency) => dependency.id);
  for (const requiredId of [
    "sdkwork-database",
    "sdkwork-web-framework",
    "sdkwork-iam",
    "sdkwork-utils",
    "sdkwork-drive",
    "sdkwork-core",
    "sdkwork-ui",
    "sdkwork-sdk-commons",
    "sdkwork-specs",
  ]) {
    assert.ok(dependencyIds.includes(requiredId), `sdkwork.workflow.json must declare ${requiredId}`);
  }
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.match(pkg.scripts["workflow:prepare-ci-dependencies"], /prepare-ci-dependencies\.mjs/);
});

test("operations runbook documents health probes and failure modes", () => {
  const runbook = readFileSync(
    path.join(repoRoot, "docs/runbooks/customerservice-operations.md"),
    "utf8",
  );
  assert.match(runbook, /\/healthz/);
  assert.match(runbook, /\/readyz/);
  assert.match(runbook, /AuthenticationRequired/);
  assert.doesNotMatch(runbook, /packages\/common/);
});
