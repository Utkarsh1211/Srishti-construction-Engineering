import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getCached, setCache } from './cache';

/**
 * key: cache key string, e.g. `transactions:${project_id}`
 * fetchFn: async () => data
 *
 * Behavior:
 * - If cache exists: shows cached data immediately (loading = false),
 *   then silently refetches in the background (refreshing = true meanwhile).
 * - If no cache: shows a real loading spinner (loading = true) until first fetch resolves.
 * - Refetches automatically every time the screen comes into focus (e.g. navigating back).
 */
export function useCachedFetch(key, fetchFn, deps = []) {
  const cached = getCached(key);
  const [data, setData] = useState(cached?.data ?? null);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const existing = getCached(key);
    if (existing) {
      setData(existing.data);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const fresh = await fetchFn();
      setCache(key, fresh);
      setData(fresh);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { data, loading, refreshing, error, reload: load };
}