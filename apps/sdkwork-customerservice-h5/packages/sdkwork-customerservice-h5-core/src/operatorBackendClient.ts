import {
  createClient,
  type SdkworkBackendClient,
} from "sdkwork-customerservice-backend-sdk-generated-typescript";
import type { AuthTokenManager } from "@sdkwork/sdk-common";
import { resolveCustomerServiceApiBaseUrl } from "@sdkwork/customerservice-client-core";
import { isBlank } from "@sdkwork/utils";

export interface OperatorSession {
  authToken?: string;
  accessToken?: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
}

export const OPERATOR_SESSION_STORAGE_KEY = "sdkwork.customerservice.h5.operator.session";

export interface CreateBackendSdkClientOptions {
  apiBaseUrl?: string;
  session: OperatorSession | null;
  tokenManager?: AuthTokenManager;
}

export function loadOperatorSession(): OperatorSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(OPERATOR_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as OperatorSession;
  } catch {
    return null;
  }
}

export function saveOperatorSession(session: OperatorSession | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!session) {
    window.localStorage.removeItem(OPERATOR_SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(OPERATOR_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function normalizeToken(value: unknown): string | undefined {
  return typeof value === "string" && !isBlank(value) ? value.trim() : undefined;
}

export function buildOperatorSdkHeaders(session: OperatorSession): Record<string, string> {
  const headers: Record<string, string> = {};
  const tenantId = normalizeToken(session.tenantId);
  const organizationId = normalizeToken(session.organizationId);
  if (tenantId) {
    headers["Tenant-Id"] = tenantId;
  }
  if (organizationId) {
    headers["Organization-Id"] = organizationId;
  }
  return headers;
}

export function createCustomerServiceBackendClient({
  apiBaseUrl,
  session,
  tokenManager,
}: CreateBackendSdkClientOptions): SdkworkBackendClient {
  const client = createClient({
    baseUrl: resolveCustomerServiceApiBaseUrl(apiBaseUrl),
    tokenManager,
    authToken: session?.authToken,
    accessToken: session?.accessToken,
    tenantId: session?.tenantId,
    organizationId: session?.organizationId,
    headers: session ? buildOperatorSdkHeaders(session) : undefined,
    platform: "h5",
  });
  if (session?.authToken) {
    client.setAuthToken(session.authToken);
  }
  if (session?.accessToken) {
    client.setAccessToken(session.accessToken);
  }
  return client;
}
