import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
    path.join(repoRoot, "crates/sdkwork-customerservice-standalone-gateway/src/main.rs"),
    "utf8",
  );
  assert.match(source, /EnvFilter::try_from_default_env/);
});

test("gateway assembly includes infra and memory app integration tests", () => {
  const source = readFileSync(
    path.join(
      repoRoot,
      "crates/sdkwork-customerservice-gateway-assembly/tests/gateway_infra_contract.rs",
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
  const source = readFileSync(
    path.join(
      repoRoot,
      "crates/sdkwork-communication-customerservice-repository-sqlx/tests/postgres_ticket_repository.rs",
    ),
    "utf8",
  );
  assert.match(source, /postgres_retrieve_ticket_isolates_requester/);
  assert.match(source, /postgres_retrieve_ticket_isolates_tenant/);
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.match(pkg.scripts["test:postgres"], /--ignored/);
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
