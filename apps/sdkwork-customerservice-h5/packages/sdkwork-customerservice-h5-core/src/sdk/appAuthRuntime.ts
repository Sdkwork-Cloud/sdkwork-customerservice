import type { SdkworkIamRuntimeAuthRuntimeLike } from "@sdkwork/auth-pc-react";
import {
  getCustomerServiceIamAuthRuntime,
  resetCustomerServiceIamAuthRuntime,
  resolveCustomerServiceAuthAppearance,
  resolveCustomerServiceAuthRuntimeConfig,
} from "@sdkwork/customerservice-client-core";

import {
  CUSTOMER_SERVICE_H5_IAM_SESSION_STORAGE_KEY,
  getH5GlobalTokenManager,
} from "../session/iamSession";
import { getAppbaseAppSdkClient, resetAppbaseAppSdkClient } from "./appbaseAppSdkClient";
import {
  getH5AuthenticatedSdkClients,
  resetH5AuthenticatedSdkClients,
} from "./h5SdkClients";

export function getCustomerServiceH5IamRuntime(): SdkworkIamRuntimeAuthRuntimeLike {
  return getCustomerServiceIamAuthRuntime({
    platform: "h5",
    sessionStorageKey: CUSTOMER_SERVICE_H5_IAM_SESSION_STORAGE_KEY,
    tokenManager: getH5GlobalTokenManager(),
    getAppbaseAppSdkClient,
    resetAppbaseAppSdkClient,
    getAuthenticatedSdkClients: getH5AuthenticatedSdkClients,
    resetAuthenticatedSdkClients: resetH5AuthenticatedSdkClients,
  });
}

export function resetCustomerServiceH5IamRuntime(): void {
  resetCustomerServiceIamAuthRuntime();
}

export function resolveCustomerServiceH5AuthAppearance() {
  return resolveCustomerServiceAuthAppearance("h5");
}

export { resolveCustomerServiceAuthRuntimeConfig };
