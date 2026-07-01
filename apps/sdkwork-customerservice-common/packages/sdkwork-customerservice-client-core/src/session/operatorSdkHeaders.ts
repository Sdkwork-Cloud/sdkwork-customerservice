import { isBlank } from "@sdkwork/utils";

export interface OperatorSession {
  authToken?: string;
  accessToken?: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
}

function normalizeToken(value: unknown): string | undefined {
  return typeof value === "string" && !isBlank(value) ? value.trim() : undefined;
}

/** SDKWork-standard operator headers for backend SDK clients. */
export function buildOperatorSdkHeaders(session: OperatorSession): Record<string, string> {
  const headers: Record<string, string> = {};
  const tenantId = normalizeToken(session.tenantId);
  const organizationId = normalizeToken(session.organizationId);
  const userId = normalizeToken(session.userId);
  if (tenantId) {
    headers["x-sdkwork-tenant-id"] = tenantId;
  }
  if (organizationId) {
    headers["x-sdkwork-organization-id"] = organizationId;
  }
  if (userId) {
    headers["x-sdkwork-user-id"] = userId;
    headers["x-sdkwork-actor-id"] = userId;
  }
  return headers;
}
