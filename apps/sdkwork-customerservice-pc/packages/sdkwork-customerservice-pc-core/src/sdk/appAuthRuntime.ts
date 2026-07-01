import type { SdkworkIamRuntimeAuthRuntimeLike } from "@sdkwork/auth-pc-react";
import {
  getCustomerServiceIamAuthRuntime,
  resetCustomerServiceIamAuthRuntime,
  resolveCustomerServiceAuthAppearance,
  resolveCustomerServiceAuthRuntimeConfig,
  type CreateCustomerServiceIamAuthRuntimeOptions,
} from "@sdkwork/customerservice-client-core";

import { CUSTOMER_SERVICE_IAM_SESSION_STORAGE_KEY } from "../session/iamOperatorSessionBridge";
import { getOperatorTokenManager } from "../session/operatorSession";
import { getAppbaseAppSdkClient, resetAppbaseAppSdkClient } from "./appbaseAppSdkClient";
import {
  getOperatorAuthenticatedSdkClients,
  resetOperatorAuthenticatedSdkClients,
} from "./operatorSdkClients";

const PC_IAM_RUNTIME_OPTIONS: CreateCustomerServiceIamAuthRuntimeOptions = {
  platform: "pc",
  sessionStorageKey: CUSTOMER_SERVICE_IAM_SESSION_STORAGE_KEY,
  tokenManager: getOperatorTokenManager(),
  getAppbaseAppSdkClient,
  resetAppbaseAppSdkClient,
  getAuthenticatedSdkClients: getOperatorAuthenticatedSdkClients,
  resetAuthenticatedSdkClients: resetOperatorAuthenticatedSdkClients,
};

export function getCustomerServiceIamRuntime(): SdkworkIamRuntimeAuthRuntimeLike {
  return getCustomerServiceIamAuthRuntime(PC_IAM_RUNTIME_OPTIONS);
}

export function resetCustomerServiceIamRuntime(): void {
  resetCustomerServiceIamAuthRuntime();
}

export {
  resolveCustomerServiceAuthAppearance,
  resolveCustomerServiceAuthRuntimeConfig,
};

export function resolveCustomerServicePcAuthAppearance() {
  return resolveCustomerServiceAuthAppearance("pc");
}
