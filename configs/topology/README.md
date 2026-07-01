# Topology profiles

Customer Service uses the `application-http-gateway` archetype (`specs/topology.spec.json`).

## Connectivity planes

| Plane | Dev default | Routes |
| --- | --- | --- |
| Application public ingress | `http://127.0.0.1:18091` | `/app/v3/api/customer_services/*`, `/backend/v3/api/customer_services/*`, `/internal/v3/api/customer_services/*` |
| Platform API gateway | `http://127.0.0.1:3900` | IAM (`/app/v3/api/*`), Drive (`/app/v3/api/drive/*`), other platform SDKs |

The standalone gateway (`pnpm start`) serves **only** customerservice routes on the application ingress. IAM login and Drive uploads require the platform API gateway (or Vite dev proxy below).

## Local development

1. Start Postgres and run migrations: `pnpm db:bootstrap`
2. Start customerservice API: `pnpm start` (bind `127.0.0.1:18091`)
3. Start platform API gateway on `127.0.0.1:3900` (sibling `sdkwork-api-cloud-gateway` workspace) for IAM login and Drive
4. Start PC shell: `pnpm dev` (Vite `127.0.0.1:5191`)

### Vite dev proxy

PC (`5191`) and H5 (`5192`) enable `buildCustomerServiceViteDevProxy()` so browser SDK clients use same-origin relative URLs:

- `/backend/v3/api/customer_services` → application ingress (`18091`)
- `/app/v3/api/customer_services` → application ingress (`18091`)
- `/app/v3/api` and `/backend/v3/api` (other paths) → platform gateway (`3900`)

Set `VITE_SDKWORK_CUSTOMER_SERVICE_VITE_DEV_PROXY_ENABLED=false` to call absolute topology URLs instead.

### IAM login (PC and H5)

PC and H5 use `@sdkwork/auth-pc-react` at `/auth/login`. Session tokens flow through shared `createCustomerServiceIamAuthRuntime` in `client-core` and are bridged to SDK clients.

Manual token paste is available only when `VITE_SDKWORK_CUSTOMER_SERVICE_DEV_MANUAL_SESSION=true`.

## Profile files

| Profile | File |
| --- | --- |
| `standalone.unified-process.development` | `standalone.unified-process.development.env` |
| `standalone.unified-process.production` | `standalone.unified-process.production.env` |
| `cloud.split-services.production` | `cloud.split-services.production.env` |

Validate: `pnpm topology:validate` and `pnpm topology:profile:check`
