import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkCustomConfig } from './types/common';

import { CustomerServicePluginRuntimeApi, createCustomerServicePluginRuntimeApi } from './api/customer-service-plugin-runtime';

export class SdkworkCustomClient {
  private httpClient: HttpClient;

  public readonly customerServicePluginRuntime: CustomerServicePluginRuntimeApi;

  constructor(config: SdkworkCustomConfig) {
    this.httpClient = createHttpClient(config);
    this.customerServicePluginRuntime = createCustomerServicePluginRuntimeApi(this.httpClient);
  }

  setApiKey(apiKey: string): this {
    this.httpClient.setApiKey(apiKey);
    return this;
  }
  get http(): HttpClient {
    return this.httpClient;
  }
}

export function createClient(config: SdkworkCustomConfig): SdkworkCustomClient {
  return new SdkworkCustomClient(config);
}

export default SdkworkCustomClient;
