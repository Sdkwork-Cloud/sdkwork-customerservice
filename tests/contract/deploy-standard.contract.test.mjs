import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("deployments/deploy.yaml passes SDKWork deploy standard", () => {
  const result = spawnSync(
    process.execPath,
    ["../sdkwork-specs/tools/check-deploy-standard.mjs"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /check-deploy-standard ok/);
});

test("sdkwork.workflow.json declares release lifecycle", () => {
  const workflow = JSON.parse(readFileSync(path.join(root, "sdkwork.workflow.json"), "utf8"));
  assert.equal(workflow.app.id, "sdkwork-customerservice");
  assert.ok(Array.isArray(workflow.lifecycle.validate));
  assert.ok(Array.isArray(workflow.targets));
});
