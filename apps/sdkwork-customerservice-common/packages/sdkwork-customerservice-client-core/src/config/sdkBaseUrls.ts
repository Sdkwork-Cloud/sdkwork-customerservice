import { isBlank } from "@sdkwork/utils";

import {
  CUSTOMER_SERVICE_APP_API_SEGMENT,
  DEFAULT_LOCAL_APPLICATION_PUBLIC_HTTP_URL,
  DEFAULT_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL,
  SDKWORK_APP_API_PREFIX,
  SDKWORK_BACKEND_API_PREFIX,
  VITE_SDKWORK_CUSTOMER_SERVICE_APPLICATION_PUBLIC_HTTP_URL,
  VITE_SDKWORK_CUSTOMER_SERVICE_PLATFORM_API_GATEWAY_HTTP_URL,
  VITE_SDKWORK_CUSTOMER_SERVICE_VITE_DEV_PROXY_ENABLED,
} from "./topologyEnvKeys";

export type ClientRuntimeEnv = Record<string, string | boolean | undefined> & {
  DEV?: boolean | "true" | "false";
};

type RuntimeImportMetaEnv = ClientRuntimeEnv;

function readRuntimeImportMetaEnv(
  env: ClientRuntimeEnv = typeof import.meta !== "undefined"
    ? (import.meta as ImportMeta & { env: ClientRuntimeEnv }).env
    : {},
): RuntimeImportMetaEnv {
  return env;
}

export function readSdkBaseUrlEnvValue(
  key: string,
  env: ClientRuntimeEnv = readRuntimeImportMetaEnv(),
): string | undefined {
  const value = env[key];
  return typeof value === "string" && !isBlank(value) ? value.trim() : undefined;
}

function readNodeEnvValue(key: string): string | undefined {
  const processLike = globalThis as {
    process?: { env?: Record<string, string | undefined> };
  };
  const value = processLike.process?.env?.[key];
  return typeof value === "string" && !isBlank(value) ? value.trim() : undefined;
}

export function isSdkRuntimeDev(
  env: ClientRuntimeEnv = readRuntimeImportMetaEnv(),
): boolean {
  if (env.DEV === true || env.DEV === "true") {
    return true;
  }
  if (env.DEV === false || env.DEV === "false") {
    return false;
  }
  const nodeEnv = readNodeEnvValue("NODE_ENV");
  if (nodeEnv) {
    return nodeEnv !== "production";
  }
  return typeof window === "undefined";
}

function stripSdkOwnedPathSuffix(pathname: string, suffixes: string[]): string {
  const normalizedPathname = pathname.replace(/\/+$/u, "");
  if (!normalizedPathname || normalizedPathname === "/") {
    return "";
  }

  for (const suffix of suffixes) {
    const normalizedSuffix = `/${suffix.replace(/^\/+|\/+$/gu, "")}`;
    if (normalizedPathname === normalizedSuffix) {
      return "";
    }
    if (normalizedPathname.endsWith(normalizedSuffix)) {
      return normalizedPathname.slice(0, -normalizedSuffix.length) || "";
    }
  }

  return normalizedPathname;
}

export function normalizeHttpSdkBaseUrl(
  value: string,
  sdkOwnedPathSuffixes: string[] = [SDKWORK_APP_API_PREFIX, SDKWORK_BACKEND_API_PREFIX],
): string {
  try {
    const parsedUrl = new URL(value);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return value;
    }
    const normalizedPathname = stripSdkOwnedPathSuffix(parsedUrl.pathname, sdkOwnedPathSuffixes);
    return `${parsedUrl.origin}${normalizedPathname}`;
  } catch {
    return value;
  }
}

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (["1", "on", "true", "yes"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return undefined;
}

/** When true, browser SDK clients use same-origin relative bases and Vite dev proxy routes traffic. */
export function shouldUseBrowserDevProxy(
  env: ClientRuntimeEnv = readRuntimeImportMetaEnv(),
): boolean {
  if (!isSdkRuntimeDev(env)) {
    return false;
  }
  const explicit = parseBooleanEnv(
    readSdkBaseUrlEnvValue(VITE_SDKWORK_CUSTOMER_SERVICE_VITE_DEV_PROXY_ENABLED, env),
  );
  return explicit ?? true;
}

export function resolveCustomerServiceApplicationBaseUrl(
  explicit?: string,
  env: ClientRuntimeEnv = readRuntimeImportMetaEnv(),
): string {
  if (shouldUseBrowserDevProxy(env)) {
    return "";
  }
  const candidate =
    explicit ??
    readSdkBaseUrlEnvValue(VITE_SDKWORK_CUSTOMER_SERVICE_APPLICATION_PUBLIC_HTTP_URL, env) ??
    DEFAULT_LOCAL_APPLICATION_PUBLIC_HTTP_URL;
  if (isBlank(candidate)) {
    return DEFAULT_LOCAL_APPLICATION_PUBLIC_HTTP_URL;
  }
  return normalizeHttpSdkBaseUrl(candidate.replace(/\/+$/u, ""));
}

export function resolvePlatformApiGatewayBaseUrl(
  explicit?: string,
  env: ClientRuntimeEnv = readRuntimeImportMetaEnv(),
): string {
  if (shouldUseBrowserDevProxy(env)) {
    return "";
  }
  const candidate =
    explicit ??
    readSdkBaseUrlEnvValue(VITE_SDKWORK_CUSTOMER_SERVICE_PLATFORM_API_GATEWAY_HTTP_URL, env) ??
    DEFAULT_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL;
  if (isBlank(candidate)) {
    return DEFAULT_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL;
  }
  return normalizeHttpSdkBaseUrl(candidate.replace(/\/+$/u, ""));
}

/** IAM / Appbase app-api base URL (platform connectivity plane). */
export function resolveIamAppApiBaseUrl(
  explicit?: string,
  env: ClientRuntimeEnv = readRuntimeImportMetaEnv(),
): string {
  if (shouldUseBrowserDevProxy(env)) {
    return "";
  }
  return resolvePlatformApiGatewayBaseUrl(explicit, env);
}

/** Drive uploads use the platform API gateway (not the application ingress). */
export function resolveDriveApiBaseUrl(
  explicit?: string,
  env: ClientRuntimeEnv = readRuntimeImportMetaEnv(),
): string {
  return resolveIamAppApiBaseUrl(explicit, env);
}

export function resolveCustomerServiceBackendApiBaseUrl(
  explicit?: string,
  env: ClientRuntimeEnv = readRuntimeImportMetaEnv(),
): string {
  return resolveCustomerServiceApplicationBaseUrl(explicit, env);
}

export function resolveCustomerServiceAppApiBaseUrl(
  explicit?: string,
  env: ClientRuntimeEnv = readRuntimeImportMetaEnv(),
): string {
  return resolveCustomerServiceApplicationBaseUrl(explicit, env);
}

export type ClientPlatform = "pc" | "h5" | "flutter-web";

export function customerServiceAppApiPathSegment(): string {
  return CUSTOMER_SERVICE_APP_API_SEGMENT;
}
