import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("topology development profile defines dual connectivity planes", () => {
  const envText = readFileSync(
    path.join(repoRoot, "configs/topology/standalone.unified-process.development.env"),
    "utf8",
  );
  assert.match(envText, /SDKWORK_CUSTOMER_SERVICE_APPLICATION_PUBLIC_HTTP_URL=http:\/\/127\.0\.0\.1:18091/);
  assert.match(envText, /SDKWORK_CUSTOMER_SERVICE_PLATFORM_API_GATEWAY_HTTP_URL=http:\/\/127\.0\.0\.1:3900/);
  assert.match(envText, /VITE_SDKWORK_CUSTOMER_SERVICE_APPLICATION_PUBLIC_HTTP_URL=http:\/\/127\.0\.0\.1:18091/);
  assert.match(envText, /VITE_SDKWORK_CUSTOMER_SERVICE_PLATFORM_API_GATEWAY_HTTP_URL=http:\/\/127\.0\.0\.1:3900/);
});

test("vite dev proxy routes customerservice before platform catch-all", () => {
  const proxySource = readFileSync(
    path.join(
      repoRoot,
      "apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core/src/dev/viteDevProxy.ts",
    ),
    "utf8",
  );
  assert.match(proxySource, /customer_services/);
  assert.match(proxySource, /SDKWORK_BACKEND_API_PREFIX/);
  assert.match(proxySource, /SDKWORK_APP_API_PREFIX/);
});

test("PC shell integrates IAM auth routes", () => {
  const appSource = readFileSync(
    path.join(
      repoRoot,
      "apps/sdkwork-customerservice-pc/packages/sdkwork-customerservice-pc-shell/src/app.tsx",
    ),
    "utf8",
  );
  assert.match(appSource, /SdkworkSessionAuthBrowserRoot/);
  assert.match(appSource, /CustomerServiceAuthRoutes/);
  assert.match(appSource, /RequireOperatorSession/);
});

test("H5 shell integrates IAM auth gate", () => {
  const appSource = readFileSync(
    path.join(
      repoRoot,
      "apps/sdkwork-customerservice-h5/packages/sdkwork-customerservice-h5-shell/src/app.tsx",
    ),
    "utf8",
  );
  assert.match(appSource, /H5AppAuthGate/);
  assert.match(appSource, /SdkworkSessionAuthBrowserRoot/);
});

test("shared client-core exposes IAM auth runtime factory", () => {
  const source = readFileSync(
    path.join(
      repoRoot,
      "apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core/src/iam/createCustomerServiceIamAuthRuntime.ts",
    ),
    "utf8",
  );
  assert.match(source, /createSdkworkAppbasePcAuthRuntime/);
  assert.match(source, /platform: options.platform/);
});

test("plugin admin service uses generated backend SDK", () => {
  const source = readFileSync(
    path.join(
      repoRoot,
      "apps/sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core/src/services/pluginAdminService.ts",
    ),
    "utf8",
  );
  assert.match(source, /customerServicePluginsAdmin/);
  assert.doesNotMatch(source, /fetch\(/);
});

test("consumer overlay federates IAM auth packages", () => {
  const overlay = JSON.parse(
    readFileSync(
      path.resolve(repoRoot, "../sdkwork-specs/workspace/consumers/sdkwork-customerservice.json"),
      "utf8",
    ),
  );
  const packages = overlay.pnpm.packages.join("\n");
  assert.match(packages, /sdkwork-auth-pc-react/);
  assert.match(packages, /sdkwork-auth-runtime-pc-react/);
  assert.match(packages, /sdkwork-iam-credential-entry/);
});
