export const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete"]);

export const OPENAPI_AUTHORITIES = [
  {
    authorityName: "sdkwork-customerservice-app-api",
    familyName: "sdkwork-customerservice-app-sdk",
    apiPrefix: "/app/v3/api",
    sourceRouteCrate: "sdkwork-routes-customerservice-app-api",
    sourceOpenapi:
      "apis/app-api/communication/sdkwork-customerservice-app-api.openapi.json",
    sdkOpenapi:
      "sdks/sdkwork-customerservice-app-sdk/openapi/sdkwork-customerservice-app-api.openapi.json",
    sdkgenOpenapi:
      "sdks/sdkwork-customerservice-app-sdk/openapi/sdkwork-customerservice-app-api.sdkgen.json",
    defaultBaseUrl: "http://127.0.0.1:18091",
    apiSurface: "app-api",
  },
  {
    authorityName: "sdkwork-customerservice-backend-api",
    familyName: "sdkwork-customerservice-backend-sdk",
    apiPrefix: "/backend/v3/api",
    sourceRouteCrate: "sdkwork-routes-customerservice-backend-api",
    sourceOpenapi:
      "apis/backend-api/communication/sdkwork-customerservice-backend-api.openapi.json",
    sdkOpenapi:
      "sdks/sdkwork-customerservice-backend-sdk/openapi/sdkwork-customerservice-backend-api.openapi.json",
    sdkgenOpenapi:
      "sdks/sdkwork-customerservice-backend-sdk/openapi/sdkwork-customerservice-backend-api.sdkgen.json",
    defaultBaseUrl: "http://127.0.0.1:18091",
    apiSurface: "backend-api",
  },
  {
    authorityName: "sdkwork-customerservice-internal-api",
    familyName: "sdkwork-customerservice-internal-sdk",
    apiPrefix: "/internal/v3/api",
    sourceRouteCrate: "sdkwork-routes-customerservice-internal-api",
    sourceOpenapi:
      "apis/internal-api/communication/sdkwork-customerservice-internal-api.openapi.json",
    sdkOpenapi:
      "sdks/sdkwork-customerservice-internal-sdk/openapi/sdkwork-customerservice-internal-api.openapi.json",
    sdkgenOpenapi:
      "sdks/sdkwork-customerservice-internal-sdk/openapi/sdkwork-customerservice-internal-api.sdkgen.json",
    defaultBaseUrl: "http://127.0.0.1:18091",
    apiSurface: "internal-api",
  },
];

export function collectOperations(openapi) {
  const operations = [];
  for (const [pathKey, pathItem] of Object.entries(openapi.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!HTTP_METHODS.has(method)) {
        continue;
      }
      operations.push({
        method: method.toUpperCase(),
        path: pathKey,
        operationId: operation.operationId,
      });
    }
  }
  return operations.sort((left, right) =>
    `${left.path} ${left.method}`.localeCompare(`${right.path} ${right.method}`),
  );
}

export function operationKey(operation) {
  return `${operation.method} ${operation.path} ${operation.operationId}`;
}
