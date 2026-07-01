import {
  CUSTOMER_SERVICE_APP_API_SEGMENT,
  DEFAULT_LOCAL_APPLICATION_PUBLIC_HTTP_URL,
  DEFAULT_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL,
  SDKWORK_APP_API_PREFIX,
  SDKWORK_BACKEND_API_PREFIX,
  VITE_SDKWORK_CUSTOMER_SERVICE_APPLICATION_PUBLIC_HTTP_URL,
  VITE_SDKWORK_CUSTOMER_SERVICE_PLATFORM_API_GATEWAY_HTTP_URL,
} from "../config/topologyEnvKeys";

function readEnvString(
  env: Record<string, string | undefined>,
  key: string,
  fallback: string,
): string {
  const value = env[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

/**
 * Vite dev proxy: customerservice routes -> application ingress; IAM/Drive -> platform gateway.
 * More specific customer_services prefixes must precede generic /app and /backend rules.
 */
export function buildCustomerServiceViteDevProxy(
  env: Record<string, string | undefined> = {},
): Record<string, { changeOrigin: true; target: string }> {
  const applicationOrigin = readEnvString(
    env,
    VITE_SDKWORK_CUSTOMER_SERVICE_APPLICATION_PUBLIC_HTTP_URL,
    DEFAULT_LOCAL_APPLICATION_PUBLIC_HTTP_URL,
  );
  const platformOrigin = readEnvString(
    env,
    VITE_SDKWORK_CUSTOMER_SERVICE_PLATFORM_API_GATEWAY_HTTP_URL,
    DEFAULT_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL,
  );

  const customerServiceBackendPrefix = `${SDKWORK_BACKEND_API_PREFIX}/${CUSTOMER_SERVICE_APP_API_SEGMENT}`;
  const customerServiceAppPrefix = `${SDKWORK_APP_API_PREFIX}/${CUSTOMER_SERVICE_APP_API_SEGMENT}`;

  return {
    [customerServiceBackendPrefix]: {
      changeOrigin: true,
      target: applicationOrigin,
    },
    [customerServiceAppPrefix]: {
      changeOrigin: true,
      target: applicationOrigin,
    },
    [SDKWORK_BACKEND_API_PREFIX]: {
      changeOrigin: true,
      target: platformOrigin,
    },
    [SDKWORK_APP_API_PREFIX]: {
      changeOrigin: true,
      target: platformOrigin,
    },
  };
}
