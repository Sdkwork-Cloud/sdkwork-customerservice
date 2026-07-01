export {
  resolveCustomerServiceApplicationBaseUrl,
  resolveCustomerServiceAppApiBaseUrl,
  resolveCustomerServiceBackendApiBaseUrl,
  resolveDriveApiBaseUrl,
  resolveIamAppApiBaseUrl,
  resolvePlatformApiGatewayBaseUrl,
  shouldUseBrowserDevProxy,
  normalizeHttpSdkBaseUrl,
  readSdkBaseUrlEnvValue,
  isSdkRuntimeDev,
  customerServiceAppApiPathSegment,
  type ClientPlatform,
  type ClientRuntimeEnv,
} from "./sdkBaseUrls";

// Backward-compatible aliases used by existing imports.
export {
  resolveCustomerServiceApplicationBaseUrl as resolveCustomerServiceApiBaseUrl,
} from "./sdkBaseUrls";

export {
  DEFAULT_LOCAL_APPLICATION_PUBLIC_HTTP_URL,
  DEFAULT_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL,
  SDKWORK_APP_API_PREFIX,
  SDKWORK_BACKEND_API_PREFIX,
  VITE_SDKWORK_CUSTOMER_SERVICE_APPLICATION_PUBLIC_HTTP_URL,
  VITE_SDKWORK_CUSTOMER_SERVICE_PLATFORM_API_GATEWAY_HTTP_URL,
  VITE_SDKWORK_CUSTOMER_SERVICE_VITE_DEV_PROXY_ENABLED,
} from "./topologyEnvKeys";
