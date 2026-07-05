import {
  createClient as createGeneratedCustomerserviceBackendClient,
  SdkworkBackendClient,
} from '../generated/server-openapi/src/index';
import type { SdkworkBackendConfig } from '../generated/server-openapi/src/types/common';

export { SdkworkBackendClient, createGeneratedCustomerserviceBackendClient };
export type { SdkworkBackendConfig };
export * from '../generated/server-openapi/src/types';
export * from '../generated/server-openapi/src/api';
export * from '../generated/server-openapi/src/http';
export * from '../generated/server-openapi/src/auth';

export type SdkworkCustomerserviceBackendClient = SdkworkBackendClient;

export function createCustomerserviceBackendClient(config: SdkworkBackendConfig): SdkworkCustomerserviceBackendClient {
  return createGeneratedCustomerserviceBackendClient(config);
}

export function createClient(config: SdkworkBackendConfig): SdkworkCustomerserviceBackendClient {
  return createCustomerserviceBackendClient(config);
}
