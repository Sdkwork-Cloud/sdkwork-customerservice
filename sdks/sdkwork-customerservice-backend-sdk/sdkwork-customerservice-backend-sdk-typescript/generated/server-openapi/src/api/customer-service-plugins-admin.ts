import { backendApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CustomerservicePluginsAdminListPageData, PluginEnablementSummary, UpsertPluginEnablementRequest } from '../types';


export class CustomerServicePluginsAdminCustomerservicePluginsAdminEnablementApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async upsert(pluginCode: string, body: UpsertPluginEnablementRequest): Promise<PluginEnablementSummary> {
    return this.client.put<PluginEnablementSummary>(backendApiPath(`/customer_services/plugins/${serializePathParameter(pluginCode, { name: 'pluginCode', style: 'simple', explode: false })}/enablement`), body, undefined, undefined, 'application/json');
  }
}

export class CustomerServicePluginsAdminCustomerservicePluginsAdminApi {
  private client: HttpClient;
  public readonly enablement: CustomerServicePluginsAdminCustomerservicePluginsAdminEnablementApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.enablement = new CustomerServicePluginsAdminCustomerservicePluginsAdminEnablementApi(client);
  }


async list(): Promise<CustomerservicePluginsAdminListPageData> {
    return this.client.get<CustomerservicePluginsAdminListPageData>(backendApiPath(`/customer_services/plugins`));
  }
}

export class CustomerServicePluginsAdminCustomerservicePluginsApi {
  private client: HttpClient;
  public readonly admin: CustomerServicePluginsAdminCustomerservicePluginsAdminApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.admin = new CustomerServicePluginsAdminCustomerservicePluginsAdminApi(client);
  }

}

export class CustomerServicePluginsAdminCustomerserviceApi {
  private client: HttpClient;
  public readonly plugins: CustomerServicePluginsAdminCustomerservicePluginsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.plugins = new CustomerServicePluginsAdminCustomerservicePluginsApi(client);
  }

}

export class CustomerServicePluginsAdminApi {
  private client: HttpClient;
  public readonly customerservice: CustomerServicePluginsAdminCustomerserviceApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.customerservice = new CustomerServicePluginsAdminCustomerserviceApi(client);
  }

}

export function createCustomerServicePluginsAdminApi(client: HttpClient): CustomerServicePluginsAdminApi {
  return new CustomerServicePluginsAdminApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

interface PathParameterSpec {
  name: string;
  style: string;
  explode: boolean;
}

function serializePathParameter(value: unknown, spec: PathParameterSpec): string {
  if (value === undefined || value === null) {
    return '';
  }

  const style = spec.style || 'simple';
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === 'object') {
    return serializePathObject(spec.name, value as Record<string, unknown>, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}

function serializePathArray(name: string, values: unknown[], style: string, explode: boolean): string {
  const serialized = values
    .filter((item) => item !== undefined && item !== null)
    .map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === 'matrix') {
    return explode
      ? serialized.map((item) => `;${name}=${item}`).join('')
      : `;${name}=${serialized.join(',')}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? '.' : ',');
}

function serializePathObject(name: string, value: Record<string, unknown>, style: string, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === 'matrix') {
    return explode
      ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join('')
      : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',')}`;
  }
  const serialized = explode
    ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === 'label' ? '.' : ',')
    : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',');
  return pathPrefix(name, style, true) + serialized;
}

function pathPrefix(name: string, style: string, _objectValue: boolean): string {
  if (style === 'label') return '.';
  if (style === 'matrix') return `;${name}`;
  return '';
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function serializePathPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
