#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function parseSchemaTables(schemaYaml) {
  return [...schemaYaml.matchAll(/- name: (communication_[a-z_]+)/g)].map((match) => match[1]);
}

test("database contractVersion is L2 (1.0.0)", () => {
  const manifest = JSON.parse(readFileSync(path.join(root, "database/database.manifest.json"), "utf8"));
  assert.equal(manifest.contractVersion, "1.0.0");
  assert.equal(manifest.lifecycle.autoMigrate, true);
});

test("table registry matches contract schema tables", () => {
  const schemaYaml = readFileSync(path.join(root, "database/contract/schema.yaml"), "utf8");
  const schemaTables = parseSchemaTables(schemaYaml).sort();
  const registry = JSON.parse(
    readFileSync(path.join(root, "database/contract/table-registry.json"), "utf8"),
  );
  const registryTables = (registry.tables ?? []).map((entry) => entry.table_name).sort();
  assert.deepEqual(registryTables, schemaTables);
  assert.ok(registryTables.length >= 13);
});

test("plugin registry host tables are declared in schema contract", () => {
  const registry = JSON.parse(readFileSync(path.join(root, "specs/plugin-system.registry.json"), "utf8"));
  const schemaYaml = readFileSync(path.join(root, "database/contract/schema.yaml"), "utf8");
  for (const tableName of registry.hostTables ?? []) {
    assert.match(schemaYaml, new RegExp(`name: ${tableName}`));
  }
  const goofish = (registry.plugins ?? []).find((plugin) => plugin.code === "goofish");
  const manifest = JSON.parse(
    readFileSync(
      path.join(root, "plugins/sdkwork-customerservice-plugin-goofish/sdkwork.plugin.manifest.json"),
      "utf8",
    ),
  );
  assert.equal(goofish?.status, manifest.plugin?.status, "registry status must match plugin manifest");
  assert.equal(goofish?.status, "planned");
});

test("package.json defines full database lifecycle scripts", () => {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  for (const scriptName of [
    "db:validate",
    "db:materialize:contract",
    "db:bootstrap",
    "db:drift",
    "db:drift:check",
  ]) {
    assert.ok(pkg.scripts[scriptName], `missing script ${scriptName}`);
  }
});
