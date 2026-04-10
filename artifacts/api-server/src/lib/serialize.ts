export function serializeDates<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = val instanceof Date ? val.toISOString() : val;
  }
  return result as T;
}

export function serializeMany<T extends Record<string, unknown>>(arr: T[]): T[] {
  return arr.map(serializeDates);
}
