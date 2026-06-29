#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkMode = process.argv.includes("--check");

const registryPath = path.join(root, "specs/plugin-system.registry.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const errors = [];

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

for (const plugin of registry.plugins ?? []) {
  const packagePath = plugin.packagePath;
  if (!packagePath) {
    errors.push(`plugin ${plugin.code}: missing packagePath`);
    continue;
  }

  const manifestPath = path.join(root, packagePath, "sdkwork.plugin.manifest.json");
  if (!existsSync(manifestPath)) {
    errors.push(`plugin ${plugin.code}: missing manifest at ${packagePath}/sdkwork.plugin.manifest.json`);
    continue;
  }

  const manifest = readJson(path.join(packagePath, "sdkwork.plugin.manifest.json"));
  const manifestCode = manifest.plugin?.code;
  if (manifestCode !== plugin.code) {
    errors.push(
      `plugin ${plugin.code}: manifest code '${manifestCode ?? "<missing>"}' does not match registry`,
    );
  }

  if (manifest.kind !== "sdkwork.customerservice.plugin") {
    errors.push(`plugin ${plugin.code}: manifest kind must be sdkwork.customerservice.plugin`);
  }

  const overlayPath = manifest.database?.overlayRegistry;
  if (overlayPath && !existsSync(path.join(root, packagePath, overlayPath))) {
    errors.push(`plugin ${plugin.code}: overlay registry missing at ${packagePath}/${overlayPath}`);
  }

  for (const capability of plugin.capabilities ?? []) {
    if (!registry.capabilityDictionary?.[capability]) {
      errors.push(`plugin ${plugin.code}: unknown capability '${capability}' in registry`);
    }
  }
}

const hostCrate = path.join(
  root,
  "crates/sdkwork-communication-customerservice-plugin-host/src/lib.rs",
);
if (!existsSync(hostCrate)) {
  errors.push("missing plugin host crate implementation");
}

const runtimeCrate = path.join(
  root,
  "plugins/sdkwork-customerservice-plugin-goofish/crates/sdkwork-customerservice-plugin-goofish-runtime/src/lib.rs",
);
if (!existsSync(runtimeCrate)) {
  errors.push("missing goofish plugin runtime crate");
} else {
  const runtimeSource = readFileSync(runtimeCrate, "utf8");
  if (!runtimeSource.includes("capabilities")) {
    errors.push("goofish runtime must declare capability modules");
  }
}

const spiPorts = readFileSync(
  path.join(root, "crates/sdkwork-communication-customerservice-plugin-spi/src/ports.rs"),
  "utf8",
);
if (!spiPorts.includes("AccountRuntimeContext")) {
  errors.push("PluginHostPorts must accept AccountRuntimeContext for inbound persistence");
}

if (errors.length > 0) {
  console.error("plugin validation failed:");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(
  checkMode
    ? "plugin registry and manifests aligned"
    : `validated ${registry.plugins?.length ?? 0} plugin packages`,
);
