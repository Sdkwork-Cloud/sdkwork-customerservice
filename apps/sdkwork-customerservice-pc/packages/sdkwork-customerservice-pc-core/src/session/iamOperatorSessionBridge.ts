import {
  clearCustomerServiceIamSession as clearIamSession,
  commitCustomerServiceIamSession as commitIamSession,
  loadCustomerServiceIamSession as loadIamSession,
  toOperatorSession,
  type CustomerServiceIamSession,
} from "@sdkwork/customerservice-client-core";

export const CUSTOMER_SERVICE_IAM_SESSION_STORAGE_KEY =
  "sdkwork-customerservice-pc:iam-session:v1";

export type { CustomerServiceIamSession };

export function loadCustomerServiceIamSession(): CustomerServiceIamSession | null {
  return loadIamSession(CUSTOMER_SERVICE_IAM_SESSION_STORAGE_KEY);
}

export function commitCustomerServiceIamSession(
  session: CustomerServiceIamSession | null,
): CustomerServiceIamSession | null {
  return commitIamSession(CUSTOMER_SERVICE_IAM_SESSION_STORAGE_KEY, session);
}

export function clearCustomerServiceIamSession(): void {
  clearIamSession(CUSTOMER_SERVICE_IAM_SESSION_STORAGE_KEY);
}

export { toOperatorSession };
