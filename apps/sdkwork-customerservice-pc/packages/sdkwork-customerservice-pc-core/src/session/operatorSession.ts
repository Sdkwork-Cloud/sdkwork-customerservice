import { createTokenManager, type AuthTokenManager } from "@sdkwork/sdk-common";
import { isBlank } from "@sdkwork/utils";

export interface OperatorSession {
  authToken?: string;
  accessToken?: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
}

export const OPERATOR_SESSION_STORAGE_KEY = "sdkwork-customerservice-pc:session:v1";
export const OPERATOR_SESSION_CHANGED_EVENT = "sdkwork-customerservice-pc:session-changed";

let globalTokenManager: AuthTokenManager | null = null;

function getStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.localStorage;
}

function normalizeToken(value: unknown): string | undefined {
  return typeof value === "string" && !isBlank(value) ? value.trim() : undefined;
}

export function readOperatorSessionFromEnv(
  env: Record<string, string | undefined> = import.meta.env,
): OperatorSession | null {
  const accessToken = normalizeToken(env.VITE_SDKWORK_CUSTOMER_SERVICE_DEV_ACCESS_TOKEN);
  const authToken = normalizeToken(env.VITE_SDKWORK_CUSTOMER_SERVICE_DEV_AUTH_TOKEN);
  const tenantId = normalizeToken(env.VITE_SDKWORK_CUSTOMER_SERVICE_DEV_TENANT_ID);
  const organizationId = normalizeToken(env.VITE_SDKWORK_CUSTOMER_SERVICE_DEV_ORGANIZATION_ID);
  const userId = normalizeToken(env.VITE_SDKWORK_CUSTOMER_SERVICE_DEV_USER_ID);
  if (!accessToken && !authToken) {
    return null;
  }
  return {
    ...(accessToken ? { accessToken } : {}),
    ...(authToken ? { authToken } : {}),
    ...(tenantId ? { tenantId } : {}),
    ...(organizationId ? { organizationId } : {}),
    ...(userId ? { userId } : {}),
  };
}

export function loadOperatorSession(): OperatorSession | null {
  const storage = getStorage();
  if (!storage) {
    return readOperatorSessionFromEnv();
  }
  const raw = storage.getItem(OPERATOR_SESSION_STORAGE_KEY);
  if (!raw) {
    return readOperatorSessionFromEnv();
  }
  try {
    const parsed = JSON.parse(raw) as OperatorSession;
    const accessToken = normalizeToken(parsed.accessToken);
    const authToken = normalizeToken(parsed.authToken);
    if (!accessToken && !authToken) {
      return readOperatorSessionFromEnv();
    }
    return {
      ...(accessToken ? { accessToken } : {}),
      ...(authToken ? { authToken } : {}),
      ...(normalizeToken(parsed.tenantId) ? { tenantId: parsed.tenantId } : {}),
      ...(normalizeToken(parsed.organizationId) ? { organizationId: parsed.organizationId } : {}),
      ...(normalizeToken(parsed.userId) ? { userId: parsed.userId } : {}),
    };
  } catch {
    return readOperatorSessionFromEnv();
  }
}

export function saveOperatorSession(session: OperatorSession | null): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  if (!session) {
    storage.removeItem(OPERATOR_SESSION_STORAGE_KEY);
  } else {
    storage.setItem(OPERATOR_SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(OPERATOR_SESSION_CHANGED_EVENT, { detail: { session } }),
    );
  }
}

export function getOperatorTokenManager(): AuthTokenManager {
  if (!globalTokenManager) {
    globalTokenManager = createTokenManager();
  }
  const session = loadOperatorSession();
  if (session?.accessToken || session?.authToken) {
    globalTokenManager.setTokens({
      ...(session.accessToken ? { accessToken: session.accessToken } : {}),
      ...(session.authToken ? { authToken: session.authToken } : {}),
    });
  }
  return globalTokenManager;
}

export function buildOperatorSdkHeaders(session: OperatorSession): Record<string, string> {
  const headers: Record<string, string> = {};
  if (session.tenantId) {
    headers["x-sdkwork-tenant-id"] = session.tenantId;
  }
  if (session.organizationId) {
    headers["x-sdkwork-organization-id"] = session.organizationId;
  }
  if (session.userId) {
    headers["x-sdkwork-user-id"] = session.userId;
    headers["x-sdkwork-actor-id"] = session.userId;
  }
  return headers;
}
