type CacheEntry = { value: any; expires: number };

const store: Map<string, CacheEntry> = new Map();

export function setCache(key: string, value: any, ttlMs: number) {
  const expires = Date.now() + ttlMs;
  store.set(key, { value, expires });
}

export function getCache(key: string) {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) {
    store.delete(key);
    return null;
  }
  return e.value;
}

export function clearCache(key?: string) {
  if (!key) return store.clear();
  store.delete(key);
}
