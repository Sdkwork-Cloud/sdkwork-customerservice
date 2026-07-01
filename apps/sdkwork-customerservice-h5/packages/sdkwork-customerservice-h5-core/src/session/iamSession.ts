import {
  clearCustomerServiceIamSession as clearIamSession,
  commitCustomerServiceIamSession as commitIamSession,
  createCustomerServiceIamSessionChangedEventName,
  isCustomerServiceIamSessionAuthenticated,
  loadCustomerServiceIamSession as loadIamSession,
  toOperatorSession,
  type CustomerServiceIamSession,
} from "@sdkwork/customerservice-client-core";
import { createTokenManager, type AuthTokenManager } from "@sdkwork/sdk-common";

export const CUSTOMER_SERVICE_H5_IAM_SESSION_STORAGE_KEY =
  "sdkwork-customerservice-h5:iam-session:v1";

export const CUSTOMER_SERVICE_H5_IAM_SESSION_CHANGED_EVENT =
  createCustomerServiceIamSessionChangedEventName(CUSTOMER_SERVICE_H5_IAM_SESSION_STORAGE_KEY);

export type { CustomerServiceIamSession };

let globalTokenManager: AuthTokenManager | null = null;

export function getH5GlobalTokenManager(): AuthTokenManager {
  if (!globalTokenManager) {
    globalTokenManager = createTokenManager();
  }
  const session = loadCustomerServiceH5IamSession();
  if (session?.accessToken || session?.authToken) {
    globalTokenManager.setTokens({
      ...(session.accessToken ? { accessToken: session.accessToken } : {}),
      ...(session.authToken ? { authToken: session.authToken } : {}),
    });
  }
  return globalTokenManager;
}

export function loadCustomerServiceH5IamSession(): CustomerServiceIamSession | null {
  return loadIamSession(CUSTOMER_SERVICE_H5_IAM_SESSION_STORAGE_KEY);
}

export function commitCustomerServiceH5IamSession(
  session: CustomerServiceIamSession | null,
): CustomerServiceIamSession | null {
  return commitIamSession(CUSTOMER_SERVICE_H5_IAM_SESSION_STORAGE_KEY, session);
}

export function clearCustomerServiceH5IamSession(): void {
  clearIamSession(CUSTOMER_SERVICE_H5_IAM_SESSION_STORAGE_KEY);
}

export function isH5IamSessionAuthenticated(
  session: CustomerServiceIamSession | null | undefined,
): boolean {
  return isCustomerServiceIamSessionAuthenticated(session);
}

export { toOperatorSession };
