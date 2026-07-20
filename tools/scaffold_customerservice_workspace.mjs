#!/usr/bin/env node
/**
 * Bootstrap sdkwork-customerservice workspace aligned with sdkwork-specs.
 * Run: node tools/scaffold_customerservice_workspace.mjs
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeIfMissing(relativePath, content) {
  const fullPath = path.join(root, relativePath);
  if (await exists(fullPath)) {
    return false;
  }
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, "utf8");
  return true;
}

async function writeAlways(relativePath, content) {
  const fullPath = path.join(root, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, "utf8");
}

const placeholderDirs = [
  "apis/README.md",
  "apis/app-api/customerservice/examples/.gitkeep",
  "apis/app-api/customerservice/changelogs/.gitkeep",
  "apis/backend-api/customerservice/examples/.gitkeep",
  "apis/backend-api/customerservice/changelogs/.gitkeep",
  "apps/README.md",
  "crates/README.md",
  "sdks/README.md",
  "jobs/README.md",
  "tools/README.md",
  "plugins/README.md",
  "examples/README.md",
  "configs/README.md",
  "deployments/README.md",
  "scripts/README.md",
  "scripts/gateway/.gitkeep",
  "docs/README.md",
  "tests/static/.gitkeep",
  "tests/contract/.gitkeep",
  ".sdkwork/README.md",
  ".sdkwork/skills/README.md",
  ".sdkwork/plugins/README.md",
];

for (const dir of placeholderDirs) {
  const content = dir.endsWith(".gitkeep")
    ? ""
    : `# ${path.basename(path.dirname(dir)) || path.basename(dir, ".md")}\n\nSee \`../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md\`.\n`;
  await writeIfMissing(dir, content);
}

await writeAlways(
  "AGENTS.md",
  `# Repository Guidelines

## SDKWORK Soul

Read \`../sdkwork-specs/SOUL.md\` before executing tasks in this root.

## SDKWORK Standards

- \`../sdkwork-specs/README.md\`
- \`../sdkwork-specs/SOUL.md\`
- \`../sdkwork-specs/AGENTS_SPEC.md\`
- \`../sdkwork-specs/WEB_FRAMEWORK_SPEC.md\`
- \`../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md\`
- \`../sdkwork-specs/DRIVE_SPEC.md\`

## Application Identity

Application manifests live under \`apps/*/sdkwork.app.config.json\` and root \`sdkwork.app.config.json\`.
This repository root is the communication **customerservice** capability workspace (\`domain: communication\`, \`capability: customerservice\`).

## Project Rules

- Canonical domain: \`communication\`; capability: \`customerservice\` (\`DOMAIN_SPEC.md\`).
- Database table prefix: \`communication_\` for customerservice-owned tables.
- App API prefix: \`/app/v3/api/customer_services\`.
- Backend API prefix: \`/backend/v3/api/customer_services\`.
- Rust HTTP runtimes integrate \`sdkwork-web-framework\`; database lifecycle uses \`sdkwork-database\`.
- TypeScript packages consume \`@sdkwork/utils\` for shared helpers �?no local duplicates.
- File uploads MUST use \`sdkwork-drive\` (app SDK / Rust uploader / approved server facade); no direct object-storage coupling.
- \`sdkwork-discovery\` is deferred until RPC/cloud-split deployment exists.
- Generated SDK output under \`sdks/**/generated/**\` is generator-owned.

## Verification

\`\`\`bash
pnpm verify
pnpm db:validate
\`\`\`

## Documentation Canon

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)
`,
);

for (const shim of ["CLAUDE.md", "GEMINI.md", "CODEX.md"]) {
  await writeIfMissing(
    shim,
    `# ${shim.replace(".md", "")} Compatibility Shim

Read \`AGENTS.md\` in this directory. Do not duplicate SDKWork rules here.
`,
  );
}

await writeAlways(
  "README.md",
  `# sdkwork-customerservice

SDKWork communication **customerservice** capability: customer support tickets, inboxes, and operator console.

- Standards: \`../sdkwork-specs/README.md\`
- Domain: \`communication\` / capability: \`customerservice\`
- HTTP API: \`crates/sdkwork-api-customerservice-standalone-gateway/\` (planned)
- Database: \`database/\` via \`sdkwork-database\`
- File uploads: \`sdkwork-drive\` integration required

## Quick start

\`\`\`bash
pnpm install
pnpm verify
\`\`\`
`,
);

await writeAlways(
  "specs/component.spec.json",
  `${JSON.stringify(
    {
      schemaVersion: 1,
      kind: "sdkwork.component.spec",
      component: {
        name: "sdkwork-customerservice-workspace",
        displayName: "SDKWork Customer Service Workspace",
        version: "0.1.0",
        type: "rust-crate",
        root: "sdkwork-customerservice",
        domain: "communication",
        capability: "customerservice",
        languages: ["typescript", "rust"],
        generated: false,
        manifests: ["package.json", "Cargo.toml", "sdkwork.app.config.json"],
      },
      canonicalSpecs: [
        { file: "WEB_FRAMEWORK_SPEC.md", path: "../sdkwork-specs/WEB_FRAMEWORK_SPEC.md" },
        { file: "DATABASE_FRAMEWORK_SPEC.md", path: "../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md" },
        { file: "DRIVE_SPEC.md", path: "../sdkwork-specs/DRIVE_SPEC.md" },
        { file: "API_SPEC.md", path: "../sdkwork-specs/API_SPEC.md" },
      ],
      contracts: {
        publicExports: ["."],
        runtimeEntrypoints: ["package.json#scripts.verify"],
        routeManifest:
          "sdks/_route-manifests/app-api/sdkwork-api-customerservice-standalone-gateway.route-manifest.json",
        sdkClients: [],
        events: [],
        configKeys: [],
      },
      verification: { commands: ["pnpm verify"] },
    },
    null,
    2,
  )}\n`,
);

await writeAlways(
  "specs/README.md",
  `# sdkwork-customerservice component specs

Local narrowing rules for the communication customerservice capability workspace. Canonical standards remain in \`../sdkwork-specs/\`.
`,
);

await writeAlways(
  "sdkwork.app.config.json",
  `${JSON.stringify(
    {
      schemaVersion: 1,
      applicationCode: "customerservice",
      displayName: "SDKWork Customer Service",
      domain: "communication",
      capability: "customerservice",
      version: "0.1.0",
      description: "Customer support tickets, inboxes, and operator workflows.",
    },
    null,
    2,
  )}\n`,
);

await writeAlways(
  "deployments/README.md",
  `# Deployments

Per-application deploy manifests follow \`../sdkwork-specs/SDKWORK_DEPLOY_SPEC.md\`.
Add \`deployments/deploy.yaml\` when release topology is defined.
`,
);

console.log("[scaffold_customerservice_workspace] base structure written");
