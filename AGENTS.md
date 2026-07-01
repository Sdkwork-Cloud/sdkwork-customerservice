# Repository Guidelines

## SDKWORK Soul

Read `../sdkwork-specs/SOUL.md` before executing tasks in this root.

## SDKWORK Standards

- `../sdkwork-specs/README.md`
- `../sdkwork-specs/SOUL.md`
- `../sdkwork-specs/AGENTS_SPEC.md`
- `../sdkwork-specs/DEPENDENCY_MANAGEMENT_SPEC.md`
- `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../sdkwork-specs/WEB_FRAMEWORK_SPEC.md`
- `../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md`
- `../sdkwork-specs/DRIVE_SPEC.md`

## Dependency And Workspace Rules

Sibling SDKWork packages (`@sdkwork/drive-app-sdk`, `@sdkwork/iam-app-sdk`, `@sdkwork/utils`, generated SDKs, etc.) **MUST** follow `DEPENDENCY_MANAGEMENT_SPEC.md`:

- Declare each sibling source path **once** in repository-root `pnpm-workspace.yaml` `packages:` (materialized from `sdkwork-specs/workspace/consumers/sdkwork-customerservice.json` via `sync-workspace.mjs`).
- Member `package.json` files **MUST** consume SDKWork siblings with `workspace:*` only.
- **Forbidden:** `file:` / `link:` on SDKWork cross-workspace sources, or redeclaring sibling paths inside member packages.

When adding or changing SDK dependencies:

```bash
# 1. Update sdkwork-specs/workspace/consumers/sdkwork-customerservice.json
node ../sdkwork-specs/tools/sync-workspace.mjs --repo sdkwork-customerservice --root .
node ../tools/sync-workspace-catalog.mjs --target sdkwork-customerservice   # from sdkwork-space root when catalog drift
pnpm install
pnpm run check:workspace
```

`pnpm run check:workspace` runs (in order): `sync-workspace --check`, `check-workspace-member-protocol`, `check-workspace-federation-paths`, `check-workspace-lock-package-paths`. These gates are also included in `pnpm check` / `pnpm verify` through `check:app-composition` (`verify-repo.mjs` includes member-protocol checks).

Do not bypass federation failures with ad-hoc `file:` paths. Extend the consumer overlay and transitive workspace members instead (see `sdkwork-im` for Drive + IAM federation reference).

## Integration Resolution Order

When debugging 401/404 across PC/H5 shells and the Rust gateway:

1. **Topology** — confirm `specs/topology.spec.json` profile and `configs/topology/*.env` axes (`application` vs `platform` URLs).
2. **Archetype** — customerservice is `application-http-gateway`; customerservice routes live on application ingress, IAM/Drive on platform gateway.
3. **Dev proxy** — PC/H5 Vite uses `buildCustomerServiceViteDevProxy()`; SDK base URLs become same-origin relative in dev unless `VITE_SDKWORK_CUSTOMER_SERVICE_VITE_DEV_PROXY_ENABLED=false`.
4. **IAM** — PC uses `/auth/login` (`appAuthRuntime`); dual-token (`accessToken` + `authToken`) required for backend/app SDK calls.
5. **Gateway** — `pnpm start` serves customerservice only; run platform gateway on `3900` for IAM/Drive or expect 404 on those planes.
6. **Validate** — `pnpm topology:validate`, `pnpm verify`, `node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .`

## Application Identity

Application manifests live under `apps/*/sdkwork.app.config.json` and root `sdkwork.app.config.json`.
This repository root is the communication **customerservice** capability workspace (`domain: communication`, `capability: customerservice`).

## Project Rules

- Canonical domain: `communication`; capability: `customerservice` (`DOMAIN_SPEC.md`).
- Database table prefix: `communication_` for customerservice-owned tables.
- App API prefix: `/app/v3/api/customer_services`.
- Backend API prefix: `/backend/v3/api/customer_services`.
- Rust HTTP runtimes integrate `sdkwork-web-framework`; database lifecycle uses `sdkwork-database`.
- TypeScript packages consume `@sdkwork/utils` for shared helpers — no local duplicates.
- File uploads MUST use `sdkwork-drive` (app SDK / Rust uploader / approved server facade); no direct object-storage coupling.
- `sdkwork-discovery` is deferred until RPC/cloud-split deployment exists.
- Generated SDK output under `sdks/**/generated/**` is generator-owned.

## Verification

```bash
pnpm verify
pnpm run check:workspace
pnpm db:validate
```

Postgres integration (CI / pre-release with database):

```bash
pnpm test:postgres:required
```

## Documentation Canon

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)

## HTTP API Response Envelope

All L2+ `app-api`, `backend-api`, and SDKWork-owned business `open-api` HTTP contracts `MUST` follow `API_SPEC.md` section 4.5, section 14, and section 15:

- **Input:** typed request bodies, section 14.1 list/search/command input, `SdkWorkListQuery`, and `q` for free-text search.
- **Success output:** `SdkWorkApiResponse` with `{ "code": 0, "data": <payload>, "traceId": "<server-uuid>" }`.
- **Error output:** HTTP 4xx/5xx `application/problem+json` (`ProblemDetail`) with numeric `code` and `traceId`.
- Success `code` is numeric `int32`; HTTP 2xx JSON bodies `MUST` use `0` only. REST semantics remain on HTTP status (`201`, `202`, etc.).
- Platform error codes are numeric non-zero values per section 15.3 (`40001`, `40101`, `40401`, …).
- Single resource: `data.item`
- Lists: `data.items` + `data.pageInfo` (`PageInfo.mode` is `offset` or `cursor`)
- Commands: `data.accepted` plus optional `resourceId` / `status`
- Async accept (`202`): `data.operationId`, `data.status`, optional `pollUrl`

Vendor compatibility `open-api` routes that mirror upstream tool or provider wire (for example OpenAI `/v1/*`, Claude Code, Codex) `MAY` opt out only when every exempt operation declares `x-sdkwork-wire-protocol: external` and `x-sdkwork-external-protocol-id` per `API_SPEC.md` section 4.5.2. SDKWork-owned business `open-api` operations `MUST NOT` opt out.

Errors `MUST` use HTTP 4xx/5xx with `application/problem+json` (`ProblemDetail`) including required numeric `code` and `traceId`. Business failures `MUST NOT` use HTTP 2xx with non-zero `code`, string wire codes, `success`, or human `message`.

Forbidden legacy envelopes and fields: `PlusApiResult`, `AppbaseApiResult`, `StoreApiResult`, `SdkWorkResponse`, per-domain `*ApiResult`, wire field `requestId`, bare domain DTOs at the HTTP root, and top-level `{ items, pageInfo, traceId }` without `data`.

Handlers `MUST` serialize success and map errors through `sdkwork-web-framework` response mapping. Generated HTTP SDKs (`--standard-profile sdkwork-v3`) unwrap `data` by default and expose typed numeric `ProblemDetail.code` / `traceId` on errors; use `.raw` when the full envelope is required.

Before completing API contract, SDK generation, or frontend service work, run:

```bash
node <sdkwork-specs>/tools/check-api-response-envelope.mjs --workspace <workspace-root>
```

Authority: `sdkwork-specs/API_SPEC.md` section 4.5 and sections 14–16, `SDK_SPEC.md` section 4.2, `FRONTEND_SPEC.md`, `MIGRATION_SPEC.md` section 4.2.
