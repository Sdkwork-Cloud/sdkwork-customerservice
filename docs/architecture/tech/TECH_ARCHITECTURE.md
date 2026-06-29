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
  -> sdkwork-web-framework (WebRequestContext + IAM)
  -> route crates (app-api / backend-api)
  -> CustomerServiceService (domain)
  -> PluginHost + channel plugin SPI (marketplace adapters)
  -> SqlxCustomerServiceRepository (persistence)
  -> sdkwork-database lifecycle (database/)
```

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

Reference implementation: `external/xianyu-auto-reply` (Goofish). Control/data plane split mirrors its `backend-web` + `websocket` worker layout.

Ticket `channel` field stores `plugin_code` for marketplace-origin tickets (`web` remains the default manual channel).

## Integrations

| Framework | Status |
| --- | --- |
| `sdkwork-web-framework` | Required — route mounting, IAM context, route manifests |
| `sdkwork-database` | Required — migrations, lifecycle SPI |
| `sdkwork-utils` | Required — validation/string/id helpers (Rust + TypeScript) |
| `sdkwork-drive` | Required — PC uploads via `@sdkwork/drive-app-sdk`; backend stores `drive_node_id` metadata only |
| `sdkwork-discovery` | Not used — no RPC services in this release |

## API surfaces

| Surface | Prefix | Auth |
| --- | --- | --- |
| App API | `/app/v3/api/customer_services/tickets[...]` | IAM dual-token |
| Backend API | `/backend/v3/api/customer_services/tickets[...]` + channel/plugin admin | IAM dual-token |
| Internal API | `/internal/v3/api/customer_services/plugins[...]` | API key (plugin worker ingress) |

Success bodies use `SdkWorkApiResponse` (`code: 0`, `data`, `traceId`). Errors use HTTP 4xx/5xx `ProblemDetail` with numeric `code` and `traceId`.

## Deployment

- Standalone bind: `CUSTOMER_SERVICE_API_BIND` (default `0.0.0.0:18091`)
- Topology profiles: `configs/topology/*.env` + `specs/topology.spec.json`
- Deploy contract: `deployments/deploy.yaml` (validated by `pnpm deploy:validate`)
- Release workflow: `sdkwork.workflow.json` + `.github/workflows/package.yml`

## API authority

- Authored contracts: `apis/app-api/communication/`, `apis/backend-api/communication/`, `apis/internal-api/communication/`
- SDK authority copies: `sdks/sdkwork-customerservice-*-sdk/openapi/`
- Route manifest: `sdks/_route-manifests/app-api/sdkwork-customerservice-standalone-gateway.route-manifest.json`

## Operator consoles

- PC shell: `apps/sdkwork-customerservice-pc/packages/sdkwork-customerservice-pc-shell`
- H5 shell: `apps/sdkwork-customerservice-h5/packages/sdkwork-customerservice-h5-shell`
- Shared client services: `packages/common/customerservice/sdkwork-customerservice-client-core`
- Runtime/SDK wiring: `apps/sdkwork-customerservice-pc/packages/sdkwork-customerservice-pc-core`
- Generated SDKs: `sdks/sdkwork-customerservice-*-sdk/*-typescript/generated/server-openapi`
- Drive uploads: `@sdkwork/drive-app-sdk` composed uploader + customerservice app SDK attachment register

## Verification

```bash
pnpm verify
pnpm deploy:validate
pnpm api:check
pnpm db:validate
pnpm topology:validate
cargo run -p sdkwork-customerservice-standalone-gateway --bin customerservice-server
```
