# Customer Service — Operations Runbook

Operational guide for `sdkwork-customerservice` standalone gateway and split-service deployments.

## Health probes

| Probe | Path | Expected |
| --- | --- | --- |
| Liveness | `GET /healthz` | `200` `{"status":"ok"}` |
| Readiness | `GET /readyz` | `200` `{"status":"ready"}` when Postgres is reachable |
| Metrics | `GET /metrics` | Prometheus text (when metrics registry is enabled) |

Readiness executes `SELECT 1` against the configured Postgres pool via `sdkwork-web-bootstrap`.

## Required environment

| Variable | Purpose |
| --- | --- |
| `CUSTOMER_SERVICE_DATABASE_URL` | Postgres connection (`sdkwork-database`) |
| `CUSTOMER_SERVICE_CREDENTIAL_MASTER_KEY` | L3 channel credential encryption (production secret) |
| `SDKWORK_CUSTOMERSERVICE_INGRESS_TOKEN` | Internal API worker ingress |
| `CUSTOMER_SERVICE_API_BIND` | HTTP bind address (default `0.0.0.0:18091`) |

Optional:

| Variable | Purpose |
| --- | --- |
| `RUST_LOG` | Tracing filter (default `info`) |
| `CUSTOMER_SERVICE_CORS_ALLOW_ALL` | Dev-only permissive CORS (`true`/`1`) |

## Startup sequence

```bash
pnpm db:bootstrap          # migrations + seed (development)
pnpm start                 # customerservice-server on application ingress
```

For IAM login and Drive uploads in development, also run the platform API gateway on `127.0.0.1:3900` (see `configs/topology/README.md`).

## Common failures

### `GET /readyz` returns 503

- Postgres is down or `CUSTOMER_SERVICE_DATABASE_URL` is wrong.
- Check pool connectivity from the gateway host; readiness details are logged server-side only.

### App API returns 401 `AuthenticationRequired`

- Missing or invalid IAM dual-token (`Authorization` + `Access-Token`).
- PC/H5 shells must sign in via `/auth/login` or use dev manual session override.
- Verify platform gateway URL (topology `platform.api-gateway` plane).

### Drive upload 404

- Drive routes are on the **platform** gateway, not the customerservice application ingress.
- Enable Vite dev proxy or point `@sdkwork/drive-app-sdk` at the platform URL.

### Internal API returns 401/503

- `401`: missing/invalid `x-api-key` or `Authorization: Bearer` ingress token.
- `503`: `SDKWORK_CUSTOMERSERVICE_INGRESS_TOKEN` not configured on the server.

## Verification before release

```bash
pnpm verify
pnpm db:drift:check
curl -fsS http://127.0.0.1:18091/healthz
curl -fsS http://127.0.0.1:18091/readyz
```

`pnpm verify` includes:

- OpenAPI / SDK envelope checks (`SdkWorkApiResponse`, `ProblemDetail`)
- Rust route contract tests (app-api + backend-api response envelope, internal ingress auth)
- HTTP route integration tests (app-api + backend-api with in-memory repository, IAM context, IDOR on app surface)
- Gateway assembly infra + app mount integration tests
- Node static contract tests under `tests/static/`

When Postgres is available, also run:

```bash
pnpm test:postgres
# or (CI / release — fails if DATABASE_URL missing):
pnpm test:postgres:required
```

Requires `CUSTOMER_SERVICE_DATABASE_URL` (see `configs/topology/standalone.unified-process.development.env`).

## Logs

- Structured tracing via `tracing` (`RUST_LOG=info,sdkwork=debug` for diagnostics).
- Success and error HTTP bodies include `traceId`; correlate gateway logs with client SDK errors using this value.
- Do not enable `CUSTOMER_SERVICE_CORS_ALLOW_ALL` in production.
