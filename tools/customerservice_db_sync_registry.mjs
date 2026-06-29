#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseSchemaYamlTables(schemaYaml) {
  const tables = [];
  const blocks = schemaYaml.split(/\n\s*- name: /).slice(1);
  for (const block of blocks) {
    const [nameLine, ...rest] = block.split("\n");
    const name = nameLine.trim();
    const body = rest.join("\n");
    const tenantMatch = /tenantScoped:\s*(true|false)/.exec(body);
    const complianceMatch = /complianceLevel:\s*(L[123])/.exec(body);
    tables.push({
      table_name: name,
      owner: "customerservice-platform",
      compliance_level: complianceMatch?.[1] ?? "L2",
      lifecycle_status: "active",
      tenant_scoped: tenantMatch ? tenantMatch[1] === "true" : true,
    });
  }
  return tables;
}

const schemaPath = path.join(root, "database/contract/schema.yaml");
const schemaYaml = readFileSync(schemaPath, "utf8");
const tables = parseSchemaYamlTables(schemaYaml);

if (tables.length === 0) {
  console.error("[customerservice_db_sync_registry] no tables found in contract/schema.yaml");
  process.exit(1);
}

const tableRegistry = {
  schemaVersion: 1,
  kind: "sdkwork.database.table-registry",
  tables: tables.map(({ table_name, owner, compliance_level, lifecycle_status }) => ({
    table_name,
    owner,
    compliance_level,
    lifecycle_status,
  })),
};

const prefixRegistry = {
  schemaVersion: 1,
  kind: "sdkwork.database.prefix-registry",
  prefixes: [
    {
      prefix: "communication_",
      owner: "customerservice-platform",
      domain: "customerservice",
    },
  ],
};

const manifestPath = path.join(root, "database/database.manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.contractVersion = "1.0.0";
manifest.lifecycle.autoMigrate = true;
manifest.lifecycle.supportedSeedLocales = ["zh-CN", "en-US", "ja-JP", "de-DE", "fr-FR", "ru-RU", "ko-KR"];

for (const target of [
  "database/contract/table-registry.json",
  "database/table-registry.json",
  "database/contract/prefix-registry.json",
  "database/prefix-registry.json",
]) {
  const payload = target.includes("prefix") ? prefixRegistry : tableRegistry;
  writeFileSync(path.join(root, target), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  `[customerservice_db_sync_registry] synced ${tables.length} tables (contractVersion=1.0.0)`,
);
