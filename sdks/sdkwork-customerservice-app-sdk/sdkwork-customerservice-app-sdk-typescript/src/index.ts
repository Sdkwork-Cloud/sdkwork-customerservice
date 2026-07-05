import {
  createClient as createGeneratedCustomerserviceAppClient,
  SdkworkAppClient,
} from '../generated/server-openapi/src/index';
import type { SdkworkAppConfig } from '../generated/server-openapi/src/types/common';

export { SdkworkAppClient, createGeneratedCustomerserviceAppClient };
export type { SdkworkAppConfig };
export * from '../generated/server-openapi/src/types';
export * from '../generated/server-openapi/src/api';
export * from '../generated/server-openapi/src/http';
export * from '../generated/server-openapi/src/auth';

export type SdkworkCustomerserviceAppClient = SdkworkAppClient;

export function createCustomerserviceAppClient(config: SdkworkAppConfig): SdkworkCustomerserviceAppClient {
  return createGeneratedCustomerserviceAppClient(config);
}

export function createClient(config: SdkworkAppConfig): SdkworkCustomerserviceAppClient {
  return createCustomerserviceAppClient(config);
}
