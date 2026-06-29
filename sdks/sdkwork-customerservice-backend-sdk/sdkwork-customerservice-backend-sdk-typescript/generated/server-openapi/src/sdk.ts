import { HttpClient, createHttpClient } from './http/client';
import type { SdkworkBackendConfig } from './types/common';
import type { AuthTokenManager } from '@sdkwork/sdk-common';

import { CustomerServiceTicketsAdminApi, createCustomerServiceTicketsAdminApi } from './api/customer-service-tickets-admin';
import { CustomerServicePluginsAdminApi, createCustomerServicePluginsAdminApi } from './api/customer-service-plugins-admin';
import { CustomerServiceChannelsAdminApi, createCustomerServiceChannelsAdminApi } from './api/customer-service-channels-admin';

export class SdkworkBackendClient {
  private httpClient: HttpClient;

  public readonly customerServiceTicketsAdmin: CustomerServiceTicketsAdminApi;
  public readonly customerServicePluginsAdmin: CustomerServicePluginsAdminApi;
  public readonly customerServiceChannelsAdmin: CustomerServiceChannelsAdminApi;

  constructor(config: SdkworkBackendConfig) {
    this.httpClient = createHttpClient(config);
    this.customerServiceTicketsAdmin = createCustomerServiceTicketsAdminApi(this.httpClient);

    this.customerServicePluginsAdmin = createCustomerServicePluginsAdminApi(this.httpClient);

    this.customerServiceChannelsAdmin = createCustomerServiceChannelsAdminApi(this.httpClient);
  }
  setAuthToken(token: string): this {
    this.httpClient.setAuthToken(token);
    return this;
  }

  setAccessToken(token: string): this {
    this.httpClient.setAccessToken(token);
    return this;
  }

  setTokenManager(manager: AuthTokenManager): this {
    this.httpClient.setTokenManager(manager);
    return this;
  }

  get http(): HttpClient {
    return this.httpClient;
  }
}

export function createClient(config: SdkworkBackendConfig): SdkworkBackendClient {
  return new SdkworkBackendClient(config);
}

export default SdkworkBackendClient;
