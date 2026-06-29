# SDKWork Customer Service ? Product Requirements

## Goal

Deliver a production-ready **communication / customerservice** capability for SDKWork tenants: ticket lifecycle, agent replies, Drive-backed attachments, and marketplace channel plugin foundations with tenant isolation.

## Scope

- App API (`/app/v3/api/customer_services/*`) for end users
- Backend API (`/backend/v3/api/customer_services/*`) for operators
- PostgreSQL persistence via `sdkwork-database` (tickets + channel plugin host tables)
- HTTP runtime via `sdkwork-web-framework`
- Generated TypeScript SDKs (`sdkwork-customerservice-*-sdk`)
- PC operator console with IAM session panel, backend ticket queue, and Drive upload (`apps/sdkwork-customerservice-pc`)
- Channel plugin SPI + registry (`specs/PLUGIN_SYSTEM_SPEC.md`, `plugins/sdkwork-customerservice-plugin-*`)

## Non-goals (current release)

- Full Goofish/Taobao protocol workers (plugins remain `planned` until marketplace adapters land)
- gRPC / `sdkwork-discovery` (deferred until RPC split deployment)
- Real-time operator push (future messaging/RTC integration)

## Acceptance

- `pnpm verify` passes (deploy, OpenAPI, SDK, database, topology, gateway assembly, TypeScript)
- `pnpm db:materialize:contract` keeps `contract/table-registry.json` aligned with `contract/schema.yaml`
- OpenAPI authorities under `apis/` match the route manifest (`pnpm api:check`)
- Gateway serves health/ready and protected ticket routes
- Attachments: Drive upload via `@sdkwork/drive-app-sdk`, metadata register via customerservice app SDK
- Release packaging configured via `sdkwork.workflow.json`
