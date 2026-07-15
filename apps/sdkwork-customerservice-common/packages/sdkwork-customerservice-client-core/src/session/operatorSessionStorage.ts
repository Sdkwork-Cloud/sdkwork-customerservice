import { isBlank } from "@sdkwork/utils";

import type { OperatorSession } from "./operatorSdkHeaders";

export const DEFAULT_OPERATOR_SESSION_ENV_PREFIX = "VITE_SDKWORK_CUSTOMER_SERVICE_DEV_";

function normalizeToken(value: unknown): string | undefined {
  return typeof value === "string" && !isBlank(value) ? value.trim() : undefined;
}

export function normalizeOperatorSession(raw: Partial<OperatorSession>): OperatorSession | null {
  const accessToken = normalizeToken(raw.accessToken);
  const authToken = normalizeToken(raw.authToken);
  if (!accessToken && !authToken) {
    return null;
  }
  return {
    ...(accessToken ? { accessToken } : {}),
    ...(authToken ? { authToken } : {}),
    ...(normalizeToken(raw.tenantId) ? { tenantId: raw.tenantId!.trim() } : {}),
    ...(normalizeToken(raw.organizationId) ? { organizationId: raw.organizationId!.trim() } : {}),
    ...(normalizeToken(raw.userId) ? { userId: raw.userId!.trim() } : {}),
  };
}

export function readOperatorSessionFromEnv(
  env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>,
  prefix = DEFAULT_OPERATOR_SESSION_ENV_PREFIX,
): OperatorSession | null {
  return normalizeOperatorSession({
    accessToken: env[`${prefix}ACCESS_TOKEN`],
    authToken: env[`${prefix}AUTH_TOKEN`],
    tenantId: env[`${prefix}TENANT_ID`],
    organizationId: env[`${prefix}ORGANIZATION_ID`],
    userId: env[`${prefix}USER_ID`],
  });
}

function browserStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.localStorage;
}

/** Loads the durable IAM session and migrates legacy tab-scoped entries once. */
export function loadOperatorSessionFromStorage(storageKey: string): OperatorSession | null {
  const storage = browserStorage();
  if (!storage) {
    return readOperatorSessionFromEnv();
  }
  let raw = storage.getItem(storageKey);
  if (!raw && typeof window !== "undefined") {
    raw = window.sessionStorage.getItem(storageKey);
    if (raw) {
      storage.setItem(storageKey, raw);
      window.sessionStorage.removeItem(storageKey);
    }
  }
  if (!raw) {
    return readOperatorSessionFromEnv();
  }
  try {
    return normalizeOperatorSession(JSON.parse(raw) as Partial<OperatorSession>);
  } catch {
    return readOperatorSessionFromEnv();
  }
}

export function saveOperatorSessionToStorage(
  storageKey: string,
  session: OperatorSession | null,
): void {
  const storage = browserStorage();
  if (!storage) {
    return;
  }
  if (!session) {
    storage.removeItem(storageKey);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(storageKey);
    }
    return;
  }
  storage.setItem(storageKey, JSON.stringify(session));
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(storageKey);
  }
}
