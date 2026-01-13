import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Fast polling hook - shows data immediately, refreshes in background
 */
export function usePolling(fetchFn, {
  interval = 30000,
  enabled = true
} = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);
  const fetchFnRef = useRef(fetchFn);
  
  // Keep fetchFn ref updated
  fetchFnRef.current = fetchFn;
  
  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading && !data) {
      setLoading(true);
    }
    
    try {
      const result = await fetchFnRef.current();
      
      if (isMountedRef.current) {
        setData(result);
        setError(null);
        setLastUpdated(new Date());
        setLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [data]);
  
  const refresh = useCallback(() => fetchData(false), [fetchData]);
  
  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    fetchData(true);
    
    return () => {
      isMountedRef.current = false;
    };
  }, []); // Only run once on mount
  
  // Set up polling
  useEffect(() => {
    if (!enabled || interval <= 0) return;
    
    timerRef.current = setInterval(() => {
      if (!document.hidden) {
        fetchData(false);
      }
    }, interval);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [interval, enabled, fetchData]);
  
  return {
    data,
    loading: loading && !data, // Only show loading if no data yet
    error,
    lastUpdated,
    refresh
  };
}

export default usePolling;
