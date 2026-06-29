import { isBlank } from "@sdkwork/utils";

export type ClientRuntimeEnv = Record<string, string | undefined>;

export function resolveCustomerServiceApiBaseUrl(
  explicit?: string,
  env: ClientRuntimeEnv = typeof import.meta !== "undefined"
    ? (import.meta as ImportMeta & { env: ClientRuntimeEnv }).env
    : {},
): string {
  const candidate =
    explicit ??
    env.VITE_SDKWORK_CUSTOMER_SERVICE_APPLICATION_PUBLIC_HTTP_URL ??
    env.VITE_SDKWORK_CUSTOMER_SERVICE_PLATFORM_API_GATEWAY_HTTP_URL ??
    "http://127.0.0.1:18091";
  if (isBlank(candidate)) {
    return "http://127.0.0.1:18091";
  }
  return candidate.replace(/\/+$/, "");
}

export function resolveDriveApiBaseUrl(
  explicit?: string,
  env: ClientRuntimeEnv = typeof import.meta !== "undefined"
    ? (import.meta as ImportMeta & { env: ClientRuntimeEnv }).env
    : {},
): string {
  const candidate =
    explicit ??
    env.VITE_SDKWORK_DRIVE_PLATFORM_API_GATEWAY_HTTP_URL ??
    env.VITE_SDKWORK_CUSTOMER_SERVICE_PLATFORM_API_GATEWAY_HTTP_URL ??
    "http://127.0.0.1:3900";
  if (isBlank(candidate)) {
    return "http://127.0.0.1:3900";
  }
  return candidate.replace(/\/+$/, "");
}

export type ClientPlatform = "pc" | "h5" | "flutter-web";
