# Developer Guide

Local setup, verification, and release gates for `sdkwork-customerservice`.

## Prerequisites

- Node.js 22 + pnpm 10.33
- Rust stable
- PostgreSQL 16 (local or Docker)
- Sibling SDKWork repositories materialized per workspace overlay (`../sdkwork-database`, `../sdkwork-web-framework`, `../sdkwork-iam`, `../sdkwork-utils`, etc.)

Isolated CI checkouts materialize siblings automatically:

```bash
pnpm run workflow:prepare-ci-dependencies
```

From repository root:

```bash
node ../sdkwork-specs/tools/sync-workspace.mjs --repo sdkwork-customerservice --root .
pnpm install
```

## Database bootstrap

```bash
export CUSTOMER_SERVICE_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/sdkwork_customerservice
pnpm db:bootstrap
```

Development defaults live in `configs/topology/standalone.development.env`.

## Verification

| Command | Purpose |
| --- | --- |
| `pnpm verify` | Full standards gate (OpenAPI, SDK, topology, Rust tests, clippy, Node contracts) |
| `pnpm test:postgres` | Postgres repository + gateway HTTP integration (`#[ignore]` tests; requires migrated DB) |
| `pnpm test:postgres:required` | Same as above but fails when `CUSTOMER_SERVICE_DATABASE_URL` is unset (CI/release) |
| `pnpm smoke:gateway` | Post-deploy infra smoke (`/healthz`, `/readyz`, `/metrics`; optional app-api list with `CUSTOMER_SERVICE_SMOKE_*`) |

## Local dev servers

```bash
pnpm start          # customerservice gateway @ 18091
pnpm dev            # PC shell @ 5191
pnpm dev:browser         # H5 shell @ 5192
```

IAM login and Drive require the platform API gateway on `127.0.0.1:3900` (see `configs/topology/README.md`).

## CI

`.github/workflows/governance.yml` runs:

1. `pnpm run workflow:prepare-ci-dependencies` — clone sibling SDKWork repos from `sdkwork.workflow.json`
2. `pnpm verify` on every PR/push to `main`
3. `postgres-integration` job — Postgres 16 service, `pnpm db:bootstrap`, `pnpm test:postgres`

Release workflow (`sdkwork.workflow.json`) runs `pnpm test:postgres:required` in the `validate` lifecycle when packaging with a configured database URL.

## Canon

- [PRD](../../product/prd/PRD.md)
- [Technical Architecture](../../architecture/tech/TECH_ARCHITECTURE.md)
- [Operations Runbook](../../runbooks/customerservice-operations.md)
