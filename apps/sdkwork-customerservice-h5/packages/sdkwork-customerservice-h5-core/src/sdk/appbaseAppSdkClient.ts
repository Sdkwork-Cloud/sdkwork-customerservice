import {
  createClient,
  type SdkworkAppClient,
  type SdkworkAppConfig,
} from "@sdkwork/iam-app-sdk";
import { resolveIamAppApiBaseUrl } from "@sdkwork/customerservice-client-core";

import {
  getH5GlobalTokenManager,
  loadCustomerServiceH5IamSession,
  type CustomerServiceIamSession,
} from "../session/iamSession";

let appbaseAppSdkClient: SdkworkAppClient | null = null;

export function createAppbaseAppSdkClientConfig(
  session?: CustomerServiceIamSession | null,
): SdkworkAppConfig {
  const currentSession = session ?? loadCustomerServiceH5IamSession();
  return {
    baseUrl: resolveIamAppApiBaseUrl(),
    accessToken: currentSession?.accessToken,
    authToken: currentSession?.authToken,
    platform: "h5",
    tokenManager: getH5GlobalTokenManager(),
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
