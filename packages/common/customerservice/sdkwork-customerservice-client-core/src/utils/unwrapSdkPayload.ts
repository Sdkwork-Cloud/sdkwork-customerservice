export function unwrapSdkPayload<T>(
  payload: T | { item?: T; data?: T | { item?: T } } | null | undefined,
): T | undefined {
  if (payload == null) {
    return undefined;
  }
  if (typeof payload === "object" && "item" in payload) {
    const item = (payload as { item?: T }).item;
    if (item !== undefined && item !== null) {
      return item;
    }
  }
  if (typeof payload === "object" && "data" in payload) {
    const nested = (payload as { data?: T | { item?: T } }).data;
    if (nested !== undefined && nested !== null) {
      if (typeof nested === "object" && nested !== null && "item" in nested) {
        return (nested as { item?: T }).item;
      }
      return nested as T;
    }
  }
  return payload as T;
}

export function unwrapSdkListItems<T>(
  payload:
    | { items?: T[]; pageInfo?: unknown }
    | { data?: { items?: T[] } }
    | T[]
    | null
    | undefined,
): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload == null) {
    return [];
  }
  if (typeof payload === "object" && "items" in payload && Array.isArray(payload.items)) {
    return payload.items;
  }
  if (typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: { items?: T[] } }).data;
    return data?.items ?? [];
  }
  return [];
}
