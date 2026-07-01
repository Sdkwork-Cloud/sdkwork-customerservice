#!/usr/bin/env node
/**
 * Fails when CUSTOMER_SERVICE_DATABASE_URL is missing.
 * Used by CI and release gates that require real Postgres integration coverage.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";

const databaseUrl = process.env.CUSTOMER_SERVICE_DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error(
    "customerservice_postgres_test_required: CUSTOMER_SERVICE_DATABASE_URL is required",
  );
  process.exit(1);
}

const result = spawnSync(
  "pnpm",
  [
    "test:postgres",
  ],
  {
    stdio: "inherit",
    shell: true,
    env: process.env,
  },
);

process.exit(result.status ?? 1);
