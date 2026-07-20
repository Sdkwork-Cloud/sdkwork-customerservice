# sdkwork-customerservice
repository-kind: application

SDKWork communication **customerservice** capability: support tickets, agent replies, and Drive-backed attachments.

- Standards: [`../sdkwork-specs/README.md`](../sdkwork-specs/README.md)
- Domain: `communication` / capability: `customerservice`
- Gateway: `crates/sdkwork-api-customerservice-standalone-gateway` (`customerservice-server`)
- PC console: `apps/sdkwork-customerservice-pc`
- Database: `database/` via `sdkwork-database`
- OpenAPI: `apis/app-api/communication/`, `apis/backend-api/communication/`, `apis/internal-api/communication/` (materialize via `pnpm api:materialize`)
- Deploy: `deployments/deploy.yaml` + `sdkwork.workflow.json`

## Documentation Canon

- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)

## Quick start

```bash
pnpm install
pnpm db:materialize:contract
pnpm verify
pnpm db:bootstrap      # Postgres migrations + seed (development)
pnpm start             # HTTP API on CUSTOMER_SERVICE_API_BIND (default 0.0.0.0:18091)
pnpm dev               # PC operator console on http://127.0.0.1:5191
```

Development uses dual connectivity planes (see `configs/topology/README.md`): customerservice routes on **18091**, IAM/Drive on platform gateway **3900**. PC/H5 sign in at `/auth/login` via `@sdkwork/auth-pc-react`.

Copy `apps/sdkwork-customerservice-pc/.env.example` for Vite topology URLs. Copy [`.env.example`](.env.example) for gateway/database secrets (use secret manager in production). Manual token paste is dev-only (`VITE_SDKWORK_CUSTOMER_SERVICE_DEV_MANUAL_SESSION=true`).

## Database bootstrap

```bash
export CUSTOMER_SERVICE_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/sdkwork_customerservice
pnpm db:bootstrap
```

## API surfaces

| Surface | Prefix |
| --- | --- |
| App API | `/app/v3/api/customer_services/tickets` |
| Backend API | `/backend/v3/api/customer_services/tickets` |
| Internal API | `/internal/v3/api/customer_services/plugins` |

Attachments register `driveNodeId` metadata only — upload bytes through `sdkwork-drive` per `DRIVE_SPEC.md`.

Success bodies use `SdkWorkApiResponse` (`code: 0`, `data`, `traceId`); errors use HTTP 4xx/5xx `ProblemDetail`.

## Verification and CI

```bash
pnpm verify                 # standards gate (OpenAPI, SDK, Rust/Node tests, clippy)
pnpm test:postgres          # Postgres E2E when DATABASE_URL is set
pnpm smoke:gateway          # gateway health/readiness/metrics smoke
pnpm run workflow:prepare-ci-dependencies   # isolated checkout sibling repos
```

GitHub Actions `.github/workflows/governance.yml` runs `pnpm verify` and `postgres-integration` on every PR/push to `main`.

See [docs/guides/developer/README.md](docs/guides/developer/README.md) and [docs/runbooks/customerservice-operations.md](docs/runbooks/customerservice-operations.md).

## Application Roots

- [apps directory index](apps/README.md)
