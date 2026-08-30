const cache = new Map<string, { data: unknown; timestamp: number }>();
const STALE_TIME = 30_000;

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  return entry ? (entry.data as T) : null;
}

export function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function isFresh(key: string): boolean {
  const entry = cache.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp < STALE_TIME;
}
