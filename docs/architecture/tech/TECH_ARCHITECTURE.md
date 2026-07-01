# SDKWork Customer Service — Technical Architecture

## Identity

| Field | Value |
| --- | --- |
| Repository | `sdkwork-customerservice` |
| Domain | `communication` |
| Capability | `customerservice` |
| Table prefix | `communication_` |
| DB service code | `CUSTOMER_SERVICE` |

## Layering

```text
HTTP gateway (sdkwork-customerservice-standalone-gateway)
  -> sdkwork-web-framework (WebRequestContext + IAM + trace propagation)
  -> route crates (app-api / backend-api / internal-api)
  -> CustomerServiceService (domain + credential crypto + ownership checks)
  -> PluginHost + channel plugin SPI (marketplace adapters)
  -> SqlxCustomerServiceRepository (persistence)
  -> sdkwork-database lifecycle (database/)
```

## Security model

| Surface | Auth | Tenant isolation |
| --- | --- | --- |
| App API | IAM dual-token | `tenant_id` + `requester_user_id` on all ticket reads/writes |
| Backend API | IAM dual-token + route manifest permissions | `tenant_id` on all admin operations |
| Internal API | `x-api-key` / Bearer ingress token | `x-sdkwork-tenant-id` + account tenant match |

Channel credentials use `aes256gcm-v1` envelope (`sdkwork-utils-rust` AES-256-GCM + HKDF master key from `CUSTOMER_SERVICE_CREDENTIAL_MASTER_KEY`).

Ingress and handler errors use HTTP 4xx/5xx `application/problem+json` (`ProblemDetail` with numeric `code` and `traceId`).

## Channel plugin system

Marketplace integrations (Goofish, Taobao, and future channel plugins) use a **host + plugin** model:

| Layer | Location | Role |
| --- | --- | --- |
| Spec | `specs/PLUGIN_SYSTEM_SPEC.md` | Plugin contract, SPI traits, DB tiers |
| Registry | `specs/plugin-system.registry.json` | Registered `plugin_code` catalog |
| SPI | `crates/sdkwork-communication-customerservice-plugin-spi` | Rust traits for plugins |
| Plugins | `plugins/sdkwork-customerservice-plugin-*` | Platform runtime packages |
| Host DB | `communication_cs_channel_*`, `communication_cs_plugin_*` | Cross-platform persistence |
| Overlay DB | `communication_cs_plugin_<code>_*` | Plugin-owned tables via schema registry |
| ADR | `docs/architecture/decisions/ADR-20250627-customerservice-channel-plugin-system.md` | Architecture decision |

Ticket `channel` field stores `plugin_code` for marketplace-origin tickets (`web` remains the default manual channel).

## Integrations

| Framework | Status |
| --- | --- |
| `sdkwork-web-framework` | Required — route mounting, IAM context, route manifests, readiness |
| `sdkwork-database` | Required — migrations, lifecycle SPI |
| `sdkwork-utils` | Required — validation/string/id/crypto helpers (Rust + TypeScript) |
| `sdkwork-drive` | Required — PC and H5 uploads via `@sdkwork/drive-app-sdk`; backend stores `drive_node_id` metadata only |
| `sdkwork-discovery` | Not used — no RPC services in this release |

## API surfaces

| Surface | Prefix | Auth |
| --- | --- | --- |
| App API | `/app/v3/api/customer_services/tickets[...]` | IAM dual-token |
| Backend API | `/backend/v3/api/customer_services/tickets[...]` + channel/plugin admin | IAM dual-token |
| Internal API | `/internal/v3/api/customer_services/plugins[...]` | API key + `x-sdkwork-tenant-id` |

Success bodies use `SdkWorkApiResponse` (`code: 0`, `data`, `traceId`). Errors use HTTP 4xx/5xx `ProblemDetail` with numeric `code` and `traceId`.

App list queries: `page`, `pageSize`, `limit` (alias), optional `status`.

## Deployment

- Standalone bind: `CUSTOMER_SERVICE_API_BIND` (default `0.0.0.0:18091`)
- Readiness: Postgres `SELECT 1` via `sdkwork-web-bootstrap` readiness probe
- CORS: disabled by default; set `CUSTOMER_SERVICE_CORS_ALLOW_ALL=true` for local dev only
- Topology profiles: `configs/topology/*.env` + `specs/topology.spec.json`
- Deploy contract: `deployments/deploy.yaml` (validated by `pnpm deploy:validate`)
- Release workflow: `sdkwork.workflow.json` + `.github/workflows/package.yml`

## API authority

- Authored contracts: `apis/app-api/communication/`, `apis/backend-api/communication/`, `apis/internal-api/communication/`
- Contract pipeline: `pnpm api:materialize` runs normalize → align → export
- `pnpm api:check` validates align idempotency and route-manifest parity
- SDK authority copies: `sdks/sdkwork-customerservice-*-sdk/openapi/`
- Route manifest: `sdks/_route-manifests/app-api/sdkwork-customerservice-standalone-gateway.route-manifest.json`

## Operator consoles

- PC shell: `apps/sdkwork-customerservice-pc/packages/sdkwork-customerservice-pc-shell`
- H5 shell: `apps/sdkwork-customerservice-h5/packages/sdkwork-customerservice-h5-shell`
- Shared client services: `apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core`
- Shared operator headers: `buildOperatorSdkHeaders` in `client-core` (`x-sdkwork-*`)
- Shared IAM session panel: `IamSessionPanel` in `client-core` (dev-only manual token bootstrap when `VITE_SDKWORK_CUSTOMER_SERVICE_DEV_MANUAL_SESSION=true`)
- PC IAM login: `@sdkwork/auth-pc-react` + shared `createCustomerServiceIamAuthRuntime` in `client-core`
- H5 IAM login: same auth runtime factory with `platform: "h5"` and `H5AppAuthGate`
- Shared IAM session bridge: `client-core/iam/customerServiceIamSession.ts`
- Plugin admin UI: PC `PluginAdminPanel`, H5 `H5PluginAdminPanel` via `pluginAdminService`
- Topology runbook: `configs/topology/README.md`
- Domain types: `@sdkwork/customerservice-contracts` re-exports generated SDK models plus UI labels
- Generated SDKs: `sdks/sdkwork-customerservice-*-sdk/*-typescript/generated/server-openapi`

## Verification

```bash
pnpm verify
pnpm deploy:validate
pnpm api:check
pnpm db:validate
pnpm topology:validate
pnpm topology:profile:check
pnpm test:postgres:required
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .
cargo run -p sdkwork-customerservice-standalone-gateway --bin customerservice-server
```

### Automated contract coverage

| Layer | Tests |
| --- | --- |
| App API envelope | `crates/sdkwork-routes-customerservice-app-api/src/response.rs` |
| App API HTTP (memory repo) | `crates/sdkwork-routes-customerservice-app-api/src/http_integration_tests.rs` |
| Backend API envelope | `crates/sdkwork-routes-customerservice-backend-api/src/response.rs` |
| Backend API HTTP (memory repo) | `crates/sdkwork-routes-customerservice-backend-api/src/http_integration_tests.rs` |
| Internal ingress | `crates/sdkwork-routes-customerservice-internal-api/src/ingress_auth.rs` |
| Gateway infra + app mount | `crates/sdkwork-customerservice-gateway-assembly/tests/gateway_infra_contract.rs` |
| Postgres repository | `crates/sdkwork-communication-customerservice-repository-sqlx/tests/postgres_ticket_repository.rs` |
| CI / release Postgres gate | `.github/workflows/governance.yml` (`postgres-integration`), `pnpm test:postgres:required` |
| Node static/contract | `tests/static/*.test.mjs`, `tests/contract/*.test.mjs` |

Service-layer ownership checks reuse `MemoryTicketRepository` from `service/src/testing/`.

## Observability

| Concern | Implementation |
| --- | --- |
| Health | `/healthz`, `/readyz` via `sdkwork-web-bootstrap` |
| Readiness | Postgres `SELECT 1` probe in gateway assembly |
| Logs | `tracing` with `RUST_LOG` env filter on `customerservice-server` |
| Correlation | `traceId` on `SdkWorkApiResponse` and `ProblemDetail`; echoed in `x-sdkwork-trace-id` |
| Runbook | [docs/runbooks/customerservice-operations.md](../../runbooks/customerservice-operations.md) |
| HTTP metrics | `GET /metrics` exposes `sdkwork_http_requests_total` via `sdkwork-web-bootstrap` |

Application-owned business counters (`customerservice_*`) remain optional until split-service traffic baselines are defined in production.
