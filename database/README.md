# Database Lifecycle Template

Purpose: canonical starter layout for SDKWork application database lifecycle assets.

Owner: `sdkwork-specs` maintainers.

Related:

- `DATABASE_FRAMEWORK_SPEC.md`
- `DATABASE_SPEC.md`
- `../sdkwork-database/specs/DATABASE_FRAMEWORK_STANDARD.md` (when present)

Usage:

1. Copy this directory to an application root as `database/`.
2. Replace `moduleId`, `serviceCode`, and `tablePrefix`.
3. Author `contract/schema.yaml` before migrations.
4. Register `DefaultDatabaseModule` or a custom SPI module at service bootstrap.

Verification:

```bash
pnpm db:validate
pnpm db:materialize:contract
pnpm db:drift:check
```

Sync `contract/table-registry.json` from `contract/schema.yaml`:

```bash
pnpm db:materialize:contract
```

## Initialization state

This module is in **initialization state** for greenfield deployments:

1. **Baseline** — `database/ddl/baseline/{engine}/0001_customerservice_baseline.sql` contains the full DDL snapshot.
2. **Migrations** — `database/migrations/{engine}/` is reserved for post-GA incremental schema changes only. It is intentionally empty at initialization.
3. **Drift** — run `pnpm db:drift:check` before release.

## Commands

```bash
pnpm run db:validate
pnpm run db:materialize:contract
pnpm run db:plan
pnpm run db:init
pnpm run db:migrate
pnpm run db:seed
pnpm run db:status
pnpm run db:drift:check
```
