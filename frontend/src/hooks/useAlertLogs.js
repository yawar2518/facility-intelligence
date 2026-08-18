import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export function useAlertLogs(filters = {}) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);

        const response = await apiClient.get(`/alert-logs/?${params.toString()}`);
        const data = response.data;
        if (!cancelled) setLogs(data.results ?? data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    const interval = setInterval(fetch, 60000); // refresh every 60s
    return () => { cancelled = true; clearInterval(interval); };
  }, [filters.status]);

  return { logs, loading, error };
}