/** Parses a JSON field that may already be an array or a JSON string. */
export function ensureArray<T>(value: T[] | string | unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}
