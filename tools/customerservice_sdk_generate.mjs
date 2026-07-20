#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  OPENAPI_AUTHORITIES,
  collectOperations,
  operationKey,
} from "./customerservice_openapi_shared.mjs";

const OFFICIAL_LANGUAGE_ORDER = ["typescript", "rust", "java", "python", "go"];
const DEFAULT_LANGUAGE = "typescript";
const STANDARD_PROFILE = "sdkwork-v3";
const GENERATOR_BIN = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "sdkwork-sdk-generator",
  "bin",
  "sdkgen.js",
);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const driveAppSdkDependency = {
  workspace: "sdkwork-drive-app-sdk",
  role: "drive-media-resource-app-capability",
  required: true,
  dependencyMode: "consumer-sdk",
  apiPrefix: "/app/v3/api",
  apiAuthority: "sdkwork-drive.app",
  generatedTransportImportPolicy: "forbidden",
  packageByLanguage: {
    typescript: "@sdkwork/drive-app-sdk",
    rust: "sdkwork-drive-app-sdk",
    java: "com.sdkwork:sdkwork-drive-app-sdk",
    python: "sdkwork-drive-app-sdk",
    go: "github.com/sdkwork/sdkwork-drive-app-sdk",
  },
};

const families = OPENAPI_AUTHORITIES.map((authority) => ({
  familyName: authority.familyName,
  authorityName: authority.authorityName,
  sdkType: authority.apiSurface === "backend-api"
    ? "backend"
    : authority.apiSurface === "internal-api"
      ? "custom"
      : "app",
  apiPrefix: authority.apiPrefix,
  sourceRouteCrate: authority.sourceRouteCrate,
  sourceOpenapi: authority.sourceOpenapi,
  defaultBaseUrl: authority.defaultBaseUrl,
  sdkDependencies: authority.apiSurface === "app-api" ? [driveAppSdkDependency] : [],
}));

function fail(message) {
  process.stderr.write(`[customerservice_sdk_generate] ${message}\n`);
  process.exit(1);
}

function resolveRoot(relativeOrAbsolute) {
  return path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.resolve(workspaceRoot, relativeOrAbsolute);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function validateOpenapi(family, openapi) {
  if (openapi.openapi !== "3.1.2") {
    throw new Error(`${family.authorityName} must use OpenAPI 3.1.2`);
  }
  if (openapi.info?.["x-sdkwork-api-authority"] !== family.authorityName) {
    throw new Error(`${family.authorityName} authority metadata mismatch`);
  }
  const operations = collectOperations(openapi);
  if (operations.length === 0) {
    throw new Error(`${family.authorityName} must declare operations`);
  }
  for (const operation of operations) {
    if (!operation.path.startsWith(family.apiPrefix)) {
      throw new Error(`${operation.path} must start with ${family.apiPrefix}`);
    }
    if (operation.path.includes("customer-services")) {
      throw new Error(`${operation.operationId} must use lower_snake_case path segment customer_services`);
    }
  }
  return operations;
}

function languageEntries(family) {
  return OFFICIAL_LANGUAGE_ORDER.map((language) => ({
    language,
    workspace: `${family.familyName}-${language}`,
    generationState: "declared",
    releaseState: "not_published",
    generatedPath: `${family.familyName}-${language}/generated/server-openapi`,
    name:
      language === "typescript"
        ? `@sdkwork/${family.familyName}`
        : language === "java"
          ? `com.sdkwork:${family.familyName}`
          : language === "go"
            ? `github.com/sdkwork/${family.familyName}`
            : family.familyName,
    version: "0.1.0",
  }));
}

function componentSpec(family, operations) {
  return {
    schemaVersion: 1,
    kind: "sdkwork.component.spec",
    component: {
      name: family.familyName,
      displayName:
        family.sdkType === "app"
          ? "SDKWork Customer Service App SDK"
          : "SDKWork Customer Service Backend SDK",
      version: "0.1.0",
      type: "sdk-family",
      root: `sdkwork-customerservice/sdks/${family.familyName}`,
      domain: "communication",
      declaredDomain: "CustomerService",
      capability: `${family.sdkType}-sdk`,
      status: "standardizing",
      languages: OFFICIAL_LANGUAGE_ORDER,
      generated: true,
      private: true,
      manifests: ["sdk-manifest.json"],
    },
    contracts: {
      publicExports: [],
      runtimeEntrypoints: ["bin/generate-sdk.mjs"],
      sdkClients: [],
      sdkDependencies: family.sdkDependencies,
      events: [],
      configKeys: [],
      ownedOperations: operations.map((operation) => operation.operationId),
    },
    verification: {
      commands: [`node tools/customerservice_sdk_generate.mjs --check --family ${family.familyName}`],
    },
  };
}

function syncFamily(family) {
  const sourceOpenapiPath = resolveRoot(family.sourceOpenapi);
  if (!existsSync(sourceOpenapiPath)) {
    throw new Error(`missing source OpenAPI: ${family.sourceOpenapi}`);
  }
  const openapi = readJson(sourceOpenapiPath);
  const operations = validateOpenapi(family, openapi);
  const familyRoot = path.join(workspaceRoot, "sdks", family.familyName);
  const authorityPath = path.join(familyRoot, "openapi", `${family.authorityName}.openapi.json`);
  const sdkgenPath = path.join(familyRoot, "openapi", `${family.authorityName}.sdkgen.json`);

  writeJson(authorityPath, openapi);
  writeJson(sdkgenPath, openapi);
  writeJson(path.join(familyRoot, "sdk-manifest.json"), {
    schemaVersion: 1,
    workspace: family.familyName,
    sdkName: family.familyName,
    sdkFamily: family.familyName,
    sdkType: family.sdkType,
    sdkOwner: "sdkwork-customerservice",
    apiAuthority: family.authorityName,
    sourceAuthoritySpec: `../../${family.sourceOpenapi}`,
    authoritySpec: `openapi/${family.authorityName}.openapi.json`,
    generationInputSpec: `openapi/${family.authorityName}.sdkgen.json`,
    derivedSpecs: {
      default: `openapi/${family.authorityName}.sdkgen.json`,
    },
    discoverySurface: {
      sdkTarget: family.sdkType,
      apiPrefix: family.apiPrefix,
      generatedProtocols: ["http-openapi"],
      manualTransports: [],
    },
    languages: languageEntries(family),
    sdkDependencies: family.sdkDependencies,
    generatorName: "@sdkwork/sdk-generator",
    generatorEntryPoint: GENERATOR_BIN,
    standardProfile: STANDARD_PROFILE,
    ownerOnlyOperationCount: operations.length,
  });
  writeJson(path.join(familyRoot, "specs", "component.spec.json"), componentSpec(family, operations));

  return { familyRoot, sdkgenPath, operations };
}

function parseArgs(argv) {
  const parsed = {
    check: false,
    allLanguages: false,
    languages: [],
    family: null,
    baseUrl: null,
    passthrough: [],
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      parsed.check = true;
      continue;
    }
    if (arg === "--all-languages") {
      parsed.allLanguages = true;
      continue;
    }
    if (arg === "--language") {
      parsed.languages.push(argv[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (arg.startsWith("--language=")) {
      parsed.languages.push(arg.slice("--language=".length));
      continue;
    }
    if (arg === "--family") {
      parsed.family = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--base-url") {
      parsed.baseUrl = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    parsed.passthrough.push(arg);
  }
  return parsed;
}

function selectedLanguages(args) {
  if (args.allLanguages) {
    return OFFICIAL_LANGUAGE_ORDER;
  }
  const requested = args.languages.length > 0 ? args.languages : [DEFAULT_LANGUAGE];
  const normalized = requested
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  for (const language of normalized) {
    if (!OFFICIAL_LANGUAGE_ORDER.includes(language)) {
      throw new Error(`unsupported language: ${language}`);
    }
  }
  return OFFICIAL_LANGUAGE_ORDER.filter((language) => normalized.includes(language));
}

function normalizeGeneratedTypescriptSources(outputPath) {
  const sourcePath = path.join(outputPath, "src");
  if (!existsSync(sourcePath)) {
    return;
  }
  const pending = [sourcePath];
  while (pending.length > 0) {
    const currentPath = pending.pop();
    for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
        continue;
      }
      if (!entry.isFile() || path.extname(entry.name) !== ".ts") {
        continue;
      }
      const current = readFileSync(entryPath, "utf8");
      const normalized = current.replace(/[ \t]+$/gmu, "");
      if (normalized !== current) {
        writeFileSync(entryPath, normalized, "utf8");
      }
    }
  }
}

function runSdkgen(family, synced, args) {
  if (!existsSync(GENERATOR_BIN)) {
    throw new Error(`standard SDK generator not found: ${GENERATOR_BIN}`);
  }
  const languages = selectedLanguages(args);
  for (const language of languages) {
    const outputPath = path.join(
      synced.familyRoot,
      `${family.familyName}-${language}`,
      "generated",
      "server-openapi",
    );
    const result = spawnSync(
      "node",
      [
        GENERATOR_BIN,
        "generate",
        "--input",
        synced.sdkgenPath,
        "--output",
        outputPath,
        "--name",
        family.familyName,
        "--type",
        family.sdkType,
        "--language",
        language,
        "--base-url",
        args.baseUrl || family.defaultBaseUrl,
        "--api-prefix",
        family.apiPrefix,
        "--fixed-sdk-version",
        "0.1.0",
        "--sdk-root",
        synced.familyRoot,
        "--sdk-name",
        family.familyName,
        "--package-name",
        `${family.familyName}-generated-${language}`,
        "--standard-profile",
        STANDARD_PROFILE,
        ...args.passthrough,
      ],
      {
        cwd: synced.familyRoot,
        stdio: "inherit",
      },
    );
    if (result.status !== 0) {
      throw new Error(`sdkgen failed for ${family.familyName} ${language}`);
    }
    if (language === "typescript") {
      normalizeGeneratedTypescriptSources(outputPath);
    }
  }
}

function validateGeneratedTypescript(family) {
  const indexPath = path.join(
    workspaceRoot,
    "sdks",
    family.familyName,
    `${family.familyName}-typescript`,
    "generated",
    "server-openapi",
    "src",
    "index.ts",
  );
  if (!existsSync(indexPath)) {
    throw new Error(`missing generated TypeScript SDK: ${path.relative(workspaceRoot, indexPath)}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = args.family
    ? families.filter((family) => family.familyName === args.family)
    : families;
  if (targets.length === 0) {
    fail(`unknown family: ${args.family}`);
  }

  try {
    for (const family of targets) {
      const synced = syncFamily(family);
      if (!args.check) {
        runSdkgen(family, synced, args);
      } else {
        validateGeneratedTypescript(family);
        const manifestPath = path.join(
          workspaceRoot,
          "sdks/_route-manifests/app-api/sdkwork-api-customerservice-standalone-gateway.route-manifest.json",
        );
        const manifest = readJson(manifestPath);
        const openapi = readJson(resolveRoot(family.sourceOpenapi));
        const manifestRoutes = (manifest.routes ?? []).filter((route) =>
          route.path?.startsWith(family.apiPrefix),
        );
        const openapiKeys = new Set(collectOperations(openapi).map(operationKey));
        for (const route of manifestRoutes) {
          const key = `${route.method} ${route.path} ${route.operationId}`;
          if (!openapiKeys.has(key)) {
            throw new Error(`OpenAPI missing route manifest operation: ${key}`);
          }
        }
      }
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  process.stdout.write(
    `[customerservice_sdk_generate] ${args.check ? "check passed" : "generation completed"}\n`,
  );
}

await main();
