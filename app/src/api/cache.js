// Simple in-memory cache with TTL. Lives for the app session only —
// gets wiped on full app restart, which is fine since we always
// revalidate against the network anyway.

const store = new Map(); // key -> { data, timestamp }

const DEFAULT_TTL = 60 * 1000; // 1 minute

export function getCached(key) {
  return store.get(key) || null; // { data, timestamp } | null
}

export function isFresh(key, ttl = DEFAULT_TTL) {
  const entry = store.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttl;
}

export function setCache(key, data) {
  store.set(key, { data, timestamp: Date.now() });
}

// Deletes an exact key, or every key starting with a prefix
// (e.g. invalidate('transactions:') clears all project ledgers at once).
export function invalidate(prefixOrKey) {
  for (const key of store.keys()) {
    if (key === prefixOrKey || key.startsWith(prefixOrKey)) {
      store.delete(key);
    }
  }
}

export function clearAll() {
  store.clear();
}