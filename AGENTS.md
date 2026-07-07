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

Isolated CI checkouts materialize sibling SDKWork repositories before install:

```bash
pnpm run workflow:prepare-ci-dependencies
```

Authority: `sdkwork.workflow.json` + `.github/workflows/governance.yml`.

## Documentation Canon

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)

## App SDK Consumer Imports



Application, feature, shell, and service packages `MUST` consume HTTP SDKs through scoped composed consumer packages, not generator transport package names.



- App API clients: `@sdkwork/<application-code>-app-sdk`

- Backend API clients (`backend-admin` only): `@sdkwork/<application-code>-backend-sdk`

- Federated Claw Router domain surfaces: `@sdkwork/clawrouter-app-sdk/domains` and `@sdkwork/clawrouter-backend-sdk/domains`

- Open/domain API clients: `@sdkwork/<domain>-sdk`



Canonical examples (IAM):



```typescript

import { createClient, type SdkworkAppClient } from '@sdkwork/iam-app-sdk';

import type { SdkworkBackendClient } from '@sdkwork/iam-backend-sdk'; // backend-admin only

import { createClient as createClawRouterDomainsClient } from '@sdkwork/clawrouter-app-sdk/domains';

```



Forbidden in application `apps/`, `packages/`, bootstrap, services, UI, contract tests, and composed SDK `src/**` outside generator ownership:



- `sdkwork-*-app-sdk-generated-typescript`, `sdkwork-*-backend-sdk-generated-typescript`, and other generator transport names as consumer imports

- `@sdkwork/commerce-app-sdk`, `@sdkwork/commerce-backend-sdk`, `@sdkwork/clawrouter-*-domain-transport-sdk`

- filesystem paths containing `domain-transport-typescript`, `domain-transport-sdk`, or sibling `*-typescript/generated` hops from composed `src/**`

- deep imports into `generated/server-openapi/src/*` from consumers when a composed facade exists



Allowed:



- Composed facade entry imports such as `@sdkwork/iam-app-sdk`, `@sdkwork/knowledgebase-app-sdk`, and `@sdkwork/clawrouter-app-sdk/domains`

- Composed re-exports that import only from `../generated/**` within the same `*-sdk-typescript` family root

- Generated transport ownership inside `sdks/**/generated/**` only



Each SDK family `MUST` expose the composed TypeScript facade at `sdks/<sdk-family>/<sdk-family>-typescript/src/index.ts` (and optional subpath exports such as `./domains`) with `package.json#name` equal to the scoped consumer package.



Before completing SDK integration or frontend service work, run:



```bash

node <sdkwork-specs>/tools/check-app-sdk-consumer-imports.mjs --workspace <workspace-root>

```



Authority: `APP_SDK_INTEGRATION_SPEC.md` section 9, `SDK_SPEC.md` package naming table, `SDK_WORKSPACE_GENERATION_SPEC.md` composed facade rules.

## HTTP API Response Envelope

All L2+ SDKWork-owned custom HTTP contracts, including `app-api`, `backend-api`, and SDKWork-owned business `open-api`, `MUST` follow `API_SPEC.md` section 4.5, section 14, and section 15:

- **Default classification:** omitted `x-sdkwork-wire-protocol` means SDKWork-owned custom API (`sdkwork-v3`); only operation-level `x-sdkwork-wire-protocol: external` plus `x-sdkwork-external-protocol-id` identifies a third-party compatibility `open-api` operation.
- **Input:** typed request bodies, section 14.1 list/search/command input, `SdkWorkListQuery`, and `q` for free-text search.
- **Success output:** `SdkWorkApiResponse` with `{ "code": 0, "data": <payload>, "traceId": "<server-uuid>" }`.
- **Error output:** HTTP 4xx/5xx `application/problem+json` (`ProblemDetail`) with numeric `code` and `traceId`.
- Success `code` is numeric `int32`; HTTP 2xx JSON bodies `MUST` use `0` only. REST semantics remain on HTTP status (`201`, `202`, etc.).
- Platform error codes are numeric non-zero values per section 15.3 (`40001`, `40101`, `40401`, …).
- Single resource: `data.item`
- Lists: `data.items` + `data.pageInfo` (`PageInfo.mode` is `offset` or `cursor`)
- Commands: `data.accepted` plus optional `resourceId` / `status`
- Async accept (`202`): `data.operationId`, `data.status`, optional `pollUrl`
- Operation patterns: retrieve/list/search/create/update/delete/command/async/bulk semantics follow `API_SPEC.md` section 15.4; create uses `201`, delete uses `204` with no JSON body, and `PUT`/`PATCH` use SDK action `update`.

Vendor compatibility `open-api` routes that mirror upstream tool or provider wire (for example OpenAI `/v1/*`, Anthropic/Claude `/anthropic/v1/*`, Google/Gemini `/google/v1beta/*`, Claude Code, or Codex) `MAY` opt out only when every exempt operation declares operation-level `x-sdkwork-wire-protocol: external` and `x-sdkwork-external-protocol-id` per `API_SPEC.md` section 4.5.2. SDKWork-owned business `open-api` operations `MUST NOT` opt out. Mixed OpenAPI documents are validated per operation; one external operation never exempts SDKWork-owned operations in the same document.

Errors `MUST` use HTTP 4xx/5xx with `application/problem+json` (`ProblemDetail`) including required numeric `code` and `traceId`. Business failures `MUST NOT` use HTTP 2xx with non-zero `code`, string wire codes, `success`, or human `message`.

Forbidden legacy envelopes and fields: `PlusApiResult`, `AppbaseApiResult`, `StoreApiResult`, `SdkWorkResponse`, per-domain `*ApiResult`, wire field `requestId`, bare domain DTOs at the HTTP root, and top-level `{ items, pageInfo, traceId }` without `data`.

Handlers `MUST` serialize success and map errors through `sdkwork-web-framework` response mapping. Generated HTTP SDKs (`--standard-profile sdkwork-v3`) unwrap `data` by default and expose typed numeric `ProblemDetail.code` / `traceId` on errors; use `.raw` when the full envelope is required.

Before completing API contract, SDK generation, or frontend service work, run:

```bash
node <sdkwork-specs>/tools/check-api-operation-patterns.mjs --workspace <workspace-root>
node <sdkwork-specs>/tools/check-api-response-envelope.mjs --workspace <workspace-root>
```

Authority: `sdkwork-specs/API_SPEC.md` section 4.5 and sections 14–16, `SDK_SPEC.md` section 4.2, `FRONTEND_SPEC.md`, `MIGRATION_SPEC.md` section 4.2.

## List And Search Pagination

All L2+ list/search APIs and their backing services, repositories, SDK consumers, and interactive frontend lists `MUST` follow `PAGINATION_SPEC.md`:

- **Input:** standard `SdkWorkListQuery` or query params (`page`/`page_size` or `cursor`/`page_size` per `API_SPEC.md` §14.1); default `page_size` `20`; max `200` unless a documented exception exists.
- **Output:** `SdkWorkApiResponse.data.items` + `data.pageInfo` with `PageInfo.mode` (`offset` or `cursor`) per `API_SPEC.md` §16.
- **Store-level pagination:** push filtering, sorting, and page selection to SQL `LIMIT`/keyset or incrementally maintained indexes — never unbounded collect then `skip`/`take`/`slice` in process memory (`PAGINATION_SPEC.md` §2).
- **SDK and frontend:** interactive lists request one page at a time from the server; no default `listAll*` on P0/P1 paths; no client-side `slice` pagination over full downloads.

Before completing list/search API, repository, SDK list helper, projection read model, or paginated UI work, run:

```bash
node <sdkwork-specs>/tools/check-pagination.mjs --workspace <workspace-root>
```

Authority: `PAGINATION_SPEC.md`, `API_SPEC.md` §14.1/§16, `DATABASE_SPEC.md` §20.5, `WEB_BACKEND_SPEC.md` §12, `SDK_SPEC.md` §4.2/§6, `FRONTEND_SPEC.md`, `APP_SDK_INTEGRATION_SPEC.md` §9.
