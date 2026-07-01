import {
  createClient,
  type SdkworkAppClient,
  type SdkworkAppConfig,
} from "@sdkwork/iam-app-sdk";
import { resolveIamAppApiBaseUrl } from "@sdkwork/customerservice-client-core";

import { getOperatorTokenManager } from "../session/operatorSession";
import {
  CUSTOMER_SERVICE_IAM_SESSION_STORAGE_KEY,
  loadCustomerServiceIamSession,
  type CustomerServiceIamSession,
} from "../session/iamOperatorSessionBridge";

let appbaseAppSdkClient: SdkworkAppClient | null = null;

export function createAppbaseAppSdkClientConfig(
  session?: CustomerServiceIamSession | null,
): SdkworkAppConfig {
  const currentSession = session ?? loadCustomerServiceIamSession();
  return {
    baseUrl: resolveIamAppApiBaseUrl(),
    accessToken: currentSession?.accessToken,
    authToken: currentSession?.authToken,
    platform: "pc",
    tokenManager: getOperatorTokenManager(),
  };
}

export function getAppbaseAppSdkClient(): SdkworkAppClient {
  if (!appbaseAppSdkClient) {
    appbaseAppSdkClient = createClient(createAppbaseAppSdkClientConfig());
  }
  return appbaseAppSdkClient;
}

export function resetAppbaseAppSdkClient(): void {
  appbaseAppSdkClient = null;
}

export { CUSTOMER_SERVICE_IAM_SESSION_STORAGE_KEY };
