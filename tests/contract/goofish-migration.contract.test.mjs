import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("goofish migration architecture doc exists", () => {
  const doc = path.join(root, "docs/architecture/tech/GOOFISH_MIGRATION_ARCHITECTURE.md");
  assert.ok(existsSync(doc));
  assert.match(readFileSync(doc, "utf8"), /external\/xianyu-auto-reply/);
});

test("goofish plugin runtime crate exposes register factory", () => {
  const pluginLib = path.join(
    root,
    "plugins/sdkwork-customerservice-plugin-goofish/crates/sdkwork-customerservice-plugin-goofish-runtime/src/plugin.rs",
  );
  assert.match(readFileSync(pluginLib, "utf8"), /pub fn register\(\)/);
});

test("multi-surface app roots are initialized", () => {
  assert.ok(existsSync(path.join(root, "apps/sdkwork-customerservice-pc/package.json")));
  assert.ok(existsSync(path.join(root, "apps/sdkwork-customerservice-h5/package.json")));
  assert.ok(existsSync(path.join(root, "apps/sdkwork-customerservice-flutter/pubspec.yaml")));
});

test("shared client-core package exists", () => {
  assert.ok(
    existsSync(
      path.join(
        root,
        "apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core/src/index.ts",
      ),
    ),
  );
});

test("operator admin surfaces are wired in client-core and PC shell", () => {
  assert.ok(
    existsSync(
      path.join(
        root,
        "apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core/src/services/ticketAdminService.ts",
      ),
    ),
  );
  assert.ok(
    existsSync(
      path.join(
        root,
        "apps/sdkwork-customerservice-pc/packages/sdkwork-customerservice-pc-shell/src/ticket-workbench-panel.tsx",
      ),
    ),
  );
});

test("goofish overlay migration DDL exists", () => {
  assert.ok(
    existsSync(
      path.join(root, "database/ddl/migrations/postgres/0003_customerservice_plugin_goofish_overlay.sql"),
    ),
  );
});
