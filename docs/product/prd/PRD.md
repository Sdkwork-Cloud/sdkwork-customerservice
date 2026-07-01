# SDKWork Customer Service — Product Requirements

## Goal

Deliver a **communication / customerservice** capability for SDKWork tenants: secure ticket lifecycle, agent replies, Drive-backed attachments, and marketplace channel plugin foundations with strict tenant and requester isolation.

## Scope

- App API (`/app/v3/api/customer_services/*`) for end users — requester-scoped ticket access
- Backend API (`/backend/v3/api/customer_services/*`) for operators
- Internal API (`/internal/v3/api/customer_services/plugins/*`) for plugin worker ingress (API key + tenant header)
- PostgreSQL persistence via `sdkwork-database` (tickets + channel plugin host tables)
- HTTP runtime via `sdkwork-web-framework` with SdkWork v3 response envelope
- Generated TypeScript SDKs (`sdkwork-customerservice-*-sdk`)
- Shared client facades in `apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core`
- PC operator console (`apps/sdkwork-customerservice-pc`) — IAM login (`/auth/login`), ticket workbench, channel admin, plugin enablement, Drive upload
- H5 mobile shell (`apps/sdkwork-customerservice-h5`) — IAM login, end-user inbox, operator ticket/channel/plugin admin + Drive upload
- Channel plugin SPI + registry (`specs/PLUGIN_SYSTEM_SPEC.md`, `plugins/sdkwork-customerservice-plugin-*`)
- L3 credential encryption for marketplace session material (`CUSTOMER_SERVICE_CREDENTIAL_MASTER_KEY`)

## Non-goals (current release)

- Full Goofish/Taobao protocol workers in production (plugins remain `planned` until marketplace adapters land)
- gRPC / `sdkwork-discovery` (deferred until RPC split deployment)
- Real-time operator push (future messaging/RTC integration)
- Direct `@sdkwork/iam-app-sdk` embedded login widgets (PC/H5 use `@sdkwork/auth-pc-react` at `/auth/login` instead)

## Security requirements

- App-api ticket/message/attachment operations enforce `requester_user_id` ownership within tenant
- Channel credentials encrypted at rest (`aes256gcm-v1` via `sdkwork-utils` AES-256-GCM)
- Internal ingress requires `SDKWORK_CUSTOMERSERVICE_INGRESS_TOKEN` and `x-sdkwork-tenant-id`
- Missing IAM context returns HTTP 401 `AuthenticationRequired`
- Browser sessions use `sessionStorage` (legacy `localStorage` entries migrated once on load)
- CORS permissive mode only when `CUSTOMER_SERVICE_CORS_ALLOW_ALL=true` (development only)

## Acceptance

- `pnpm verify` passes (deploy, OpenAPI, SDK, database, topology, gateway assembly, envelope check, TypeScript, Rust tests)
- `pnpm test:postgres` passes when `CUSTOMER_SERVICE_DATABASE_URL` points at a migrated database
- CI `postgres-integration` job and `pnpm test:postgres:required` pass on release pipelines with Postgres
- `pnpm db:materialize:contract` keeps `contract/table-registry.json` aligned with `contract/schema.yaml`
- OpenAPI authorities under `apis/` match route handlers (`pnpm api:check`)
- Gateway serves health/ready (Postgres probe) and protected ticket routes
- Attachments: Drive upload via `@sdkwork/drive-app-sdk` on PC and H5; metadata register via customerservice app SDK
- H5 exposes full app-api ticket surface for end users with IAM login gate
- PC/H5 operator consoles expose plugin enablement admin via backend SDK
- Release packaging configured via `sdkwork.workflow.json` and `deployments/deploy.yaml` (PC + H5 + server)

## Operational prerequisites

| Variable | Purpose |
| --- | --- |
| `CUSTOMER_SERVICE_*` | Database connection (`sdkwork-database`) |
| `CUSTOMER_SERVICE_CREDENTIAL_MASTER_KEY` | L3 channel credential encryption |
| `SDKWORK_CUSTOMERSERVICE_INGRESS_TOKEN` | Internal API worker ingress |
| `CUSTOMER_SERVICE_CORS_ALLOW_ALL` | Dev-only permissive CORS (`true`/`1`) |
| `VITE_SDKWORK_CUSTOMER_SERVICE_DEV_*` | Dev operator/end-user token bootstrap (PC/H5) |
