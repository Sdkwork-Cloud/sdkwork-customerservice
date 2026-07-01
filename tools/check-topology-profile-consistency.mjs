#!/usr/bin/env node
/**
 * Validates topology profile env files against specs/topology.spec.json axes and surface keys.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = process.argv.includes("--root")
  ? process.argv[process.argv.indexOf("--root") + 1]
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const specPath = path.join(repoRoot, "specs/topology.spec.json");
const spec = JSON.parse(readFileSync(specPath, "utf8"));

function parseEnvFile(text) {
  const entries = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    entries.set(trimmed.slice(0, separator), trimmed.slice(separator + 1));
  }
  return entries;
}

const failures = [];

for (const [profileId, relativePath] of Object.entries(spec.profileFiles)) {
  const envPath = path.join(repoRoot, relativePath);
  const env = parseEnvFile(readFileSync(envPath, "utf8"));
  const [deploymentProfile, serviceLayout, environment] = profileId.split(".");

  if (env.get(spec.envKeys.profileId) !== profileId) {
    failures.push(`${relativePath}: ${spec.envKeys.profileId} must equal ${profileId}`);
  }
  if (env.get(spec.envKeys.deploymentProfile) !== deploymentProfile) {
    failures.push(
      `${relativePath}: ${spec.envKeys.deploymentProfile} must equal ${deploymentProfile}`,
    );
  }
  if (env.get(spec.envKeys.serviceLayout) !== serviceLayout) {
    failures.push(
      `${relativePath}: ${spec.envKeys.serviceLayout} must equal ${serviceLayout}`,
    );
  }
  if (env.get(spec.envKeys.environment) !== environment) {
    failures.push(`${relativePath}: ${spec.envKeys.environment} must equal ${environment}`);
  }

  for (const [surfaceId, surface] of Object.entries(spec.surfaces)) {
    if (surface.httpUrlEnv) {
      const value = env.get(surface.httpUrlEnv);
      if (!value || !/^https?:\/\//.test(value)) {
        failures.push(
          `${relativePath}: surface ${surfaceId} requires HTTP URL env ${surface.httpUrlEnv}`,
        );
      }
    }
    if (surface.clientHttpEnv) {
      const value = env.get(surface.clientHttpEnv);
      if (!value || !/^https?:\/\//.test(value)) {
        failures.push(
          `${relativePath}: surface ${surfaceId} requires client HTTP env ${surface.clientHttpEnv}`,
        );
      }
    }
    if (surface.bindEnv && surface.connectivityPlane === "application") {
      const value = env.get(surface.bindEnv);
      if (!value || !/:\d+$/.test(value)) {
        failures.push(
          `${relativePath}: surface ${surfaceId} requires bind env ${surface.bindEnv}`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error("topology profile consistency check failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `topology profile consistency ok (${Object.keys(spec.profileFiles).length} profiles)`,
);
