# sdkwork-customerservice

SDKWork communication **customerservice** capability: support tickets, agent replies, and Drive-backed attachments.

- Standards: [`../sdkwork-specs/README.md`](../sdkwork-specs/README.md)
- Domain: `communication` / capability: `customerservice`
- Gateway: `crates/sdkwork-customerservice-standalone-gateway` (`customerservice-server`)
- PC console: `apps/sdkwork-customerservice-pc`
- Database: `database/` via `sdkwork-database`
- OpenAPI: `apis/app-api/communication/` + `apis/backend-api/communication/`
- Deploy: `deployments/deploy.yaml` + `sdkwork.workflow.json`

## Documentation Canon

- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)

## Quick start

```bash
pnpm install
pnpm db:materialize:contract
pnpm verify
pnpm start          # HTTP API on CUSTOMER_SERVICE_API_BIND (default 0.0.0.0:18091)
pnpm dev            # PC operator console on http://127.0.0.1:5191
```

Copy `apps/sdkwork-customerservice-pc/.env.example` for local API URLs and optional dev IAM tokens.

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

Attachments register `driveNodeId` metadata only — upload bytes through `sdkwork-drive` per `DRIVE_SPEC.md`.

## Application Roots

- [apps directory index](apps/README.md)
