import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("plugin host crate is wired into service host", () => {
  const hostLib = path.join(root, "crates/sdkwork-customerservice-service-host/src/lib.rs");
  assert.match(readFileSync(hostLib, "utf8"), /ChannelPluginHost/);
  assert.match(readFileSync(hostLib, "utf8"), /PluginRuntimeManager/);
});

test("plugin validate script passes", () => {
  const result = spawnSync("node", ["tools/customerservice_plugin_validate.mjs", "--check"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("backend route manifest includes plugin and channel admin routes", () => {
  const manifest = path.join(
    root,
    "crates/sdkwork-routes-customerservice-backend-api/src/http_route_manifest.rs",
  );
  const source = readFileSync(manifest, "utf8");
  assert.match(source, /customer_services\/plugins/);
  assert.match(source, /customer_services\/channels\/accounts/);
  assert.match(source, /autoReplyRules\.update/);
  assert.match(source, /deliveryBlockRules\.upsert/);
});

test("plugin host crate exists", () => {
  assert.ok(
    existsSync(
      path.join(root, "crates/sdkwork-communication-customerservice-plugin-host/src/lib.rs"),
    ),
  );
});
