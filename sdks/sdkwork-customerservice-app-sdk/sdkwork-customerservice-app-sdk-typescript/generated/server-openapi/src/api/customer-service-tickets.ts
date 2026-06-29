import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CreateTicketRequest, PageInfo, RegisterTicketAttachmentRequest, SendTicketMessageRequest, TicketAttachment, TicketDetail, TicketMessage, TicketSummary } from '../types';


export class CustomerServiceTicketsCustomerserviceTicketsAttachmentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(ticketId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/customer_services/tickets/${serializePathParameter(ticketId, { name: 'ticketId', style: 'simple', explode: false })}/attachments`));
  }

async register(ticketId: string, body: RegisterTicketAttachmentRequest): Promise<TicketAttachment> {
    return this.client.post<TicketAttachment>(appApiPath(`/customer_services/tickets/${serializePathParameter(ticketId, { name: 'ticketId', style: 'simple', explode: false })}/attachments`), body, undefined, undefined, 'application/json');
  }
}

export class CustomerServiceTicketsCustomerserviceTicketsMessagesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(ticketId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/customer_services/tickets/${serializePathParameter(ticketId, { name: 'ticketId', style: 'simple', explode: false })}/messages`));
  }

async create(ticketId: string, body: SendTicketMessageRequest): Promise<TicketMessage> {
    return this.client.post<TicketMessage>(appApiPath(`/customer_services/tickets/${serializePathParameter(ticketId, { name: 'ticketId', style: 'simple', explode: false })}/messages`), body, undefined, undefined, 'application/json');
  }
}

export interface CustomerServiceTicketsCustomerserviceTicketsListParams {
  status?: string;
  cursor?: string;
  limit?: number;
}

export class CustomerServiceTicketsCustomerserviceTicketsApi {
  private client: HttpClient;
  public readonly messages: CustomerServiceTicketsCustomerserviceTicketsMessagesApi;
  public readonly attachments: CustomerServiceTicketsCustomerserviceTicketsAttachmentsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.messages = new CustomerServiceTicketsCustomerserviceTicketsMessagesApi(client);
    this.attachments = new CustomerServiceTicketsCustomerserviceTicketsAttachmentsApi(client);
  }


async list(params?: CustomerServiceTicketsCustomerserviceTicketsListParams): Promise<Record<string, unknown>> {
    const query = buildQueryString([
      { name: 'status', value: params?.status, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params?.limit, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<Record<string, unknown>>(appendQueryString(appApiPath(`/customer_services/tickets`), query));
  }

async create(body: CreateTicketRequest): Promise<TicketDetail> {
    return this.client.post<TicketDetail>(appApiPath(`/customer_services/tickets`), body, undefined, undefined, 'application/json');
  }

async retrieve(ticketId: string): Promise<TicketDetail> {
    return this.client.get<TicketDetail>(appApiPath(`/customer_services/tickets/${serializePathParameter(ticketId, { name: 'ticketId', style: 'simple', explode: false })}`));
  }
}

export class CustomerServiceTicketsCustomerserviceApi {
  private client: HttpClient;
  public readonly tickets: CustomerServiceTicketsCustomerserviceTicketsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.tickets = new CustomerServiceTicketsCustomerserviceTicketsApi(client);
  }

}

export class CustomerServiceTicketsApi {
  private client: HttpClient;
  public readonly customerservice: CustomerServiceTicketsCustomerserviceApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.customerservice = new CustomerServiceTicketsCustomerserviceApi(client);
  }

}

export function createCustomerServiceTicketsApi(client: HttpClient): CustomerServiceTicketsApi {
  return new CustomerServiceTicketsApi(client);
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
interface QueryParameterSpec {
  name: string;
  value: unknown;
  style: string;
  explode: boolean;
  allowReserved: boolean;
  contentType?: string;
}

function buildQueryString(parameters: QueryParameterSpec[]): string {
  const pairs: string[] = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

function appendSerializedParameter(pairs: string[], parameter: QueryParameterSpec): void {
  if (parameter.value === undefined || parameter.value === null) {
    return;
  }

  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }

  const style = parameter.style || 'form';
  if (style === 'deepObject') {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }

  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }

  if (typeof parameter.value === 'object') {
    appendObjectParameter(pairs, parameter.name, parameter.value as Record<string, unknown>, style, parameter.explode, parameter.allowReserved);
    return;
  }

  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}

function appendArrayParameter(
  pairs: string[],
  name: string,
  value: unknown[],
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const values = value
    .filter((item) => item !== undefined && item !== null)
    .map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }

  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}

function appendObjectParameter(
  pairs: string[],
  name: string,
  value: Record<string, unknown>,
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }

  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}

function appendDeepObjectParameter(
  pairs: string[],
  name: string,
  value: unknown,
  allowReserved: boolean,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (entryValue === undefined || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}

function serializePrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

function encodeQueryValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%23/gi, '#')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    .replace(/%40/gi, '@')
    .replace(/%21/gi, '!')
    .replace(/%24/gi, '$')
    .replace(/%26/gi, '&')
    .replace(/%27/gi, "'")
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2A/gi, '*')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
}
