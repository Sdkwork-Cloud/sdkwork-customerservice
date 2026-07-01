import type { IamAppContext } from "@sdkwork/iam-contracts";

import type { OperatorSession } from "../session/operatorSdkHeaders";
import {
  normalizeOperatorSession,
  saveOperatorSessionToStorage,
} from "../session/operatorSessionStorage";

export interface CustomerServiceIamSession {
  accessToken?: string;
  authToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  sessionId?: string;
  context?: IamAppContext;
  user?: unknown;
}

export function createCustomerServiceIamSessionStorageKeys(storageKey: string) {
  return {
    operatorStorageKey: storageKey,
    fullStorageKey: `${storageKey}:full`,
  };
}

export function toOperatorSession(
  session: CustomerServiceIamSession | null | undefined,
): OperatorSession | null {
  if (!session) {
    return null;
  }
  return normalizeOperatorSession({
    accessToken: session.accessToken,
    authToken: session.authToken,
    tenantId: session.context?.tenantId,
    organizationId: session.context?.organizationId,
    userId: session.context?.userId,
  });
}

function browserSessionStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.sessionStorage;
}

export function loadCustomerServiceIamSession(storageKey: string): CustomerServiceIamSession | null {
  const { fullStorageKey } = createCustomerServiceIamSessionStorageKeys(storageKey);
  const storage = browserSessionStorage();
  if (!storage) {
    return null;
  }
  const full = storage.getItem(fullStorageKey);
  if (full) {
    try {
      return JSON.parse(full) as CustomerServiceIamSession;
    } catch {
      return null;
    }
  }
  return null;
}

export function saveCustomerServiceIamSession(
  storageKey: string,
  session: CustomerServiceIamSession | null,
): void {
  const { operatorStorageKey, fullStorageKey } = createCustomerServiceIamSessionStorageKeys(storageKey);
  const storage = browserSessionStorage();
  const operator = toOperatorSession(session);
  saveOperatorSessionToStorage(operatorStorageKey, operator);
  if (!storage) {
    return;
  }
  if (!session) {
    storage.removeItem(fullStorageKey);
    return;
  }
  storage.setItem(fullStorageKey, JSON.stringify(session));
}

export function clearCustomerServiceIamSession(storageKey: string): void {
  saveCustomerServiceIamSession(storageKey, null);
}

export function isCustomerServiceIamSessionAuthenticated(
  session: CustomerServiceIamSession | null | undefined,
): boolean {
  return Boolean(session?.accessToken?.trim() && session?.authToken?.trim());
}

export function createCustomerServiceIamSessionChangedEventName(storageKey: string): string {
  return `${storageKey}:changed`;
}

export function dispatchCustomerServiceIamSessionChanged(
  storageKey: string,
  session: CustomerServiceIamSession | null,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(createCustomerServiceIamSessionChangedEventName(storageKey), {
      detail: { session },
    }),
  );
}

export function commitCustomerServiceIamSession(
  storageKey: string,
  session: CustomerServiceIamSession | null,
): CustomerServiceIamSession | null {
  saveCustomerServiceIamSession(storageKey, session);
  dispatchCustomerServiceIamSessionChanged(storageKey, session);
  return session;
}
