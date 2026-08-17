import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export function useMaintenanceScores(filters = {}) {
  const [scores, setScores]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.risk_level) params.append('risk_level', filters.risk_level);

        const response = await apiClient.get(
          `/monitoring/maintenance-scores/?${params.toString()}`
        );
        if (!cancelled) setScores(response.data.results ?? response.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    const interval = setInterval(fetch, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [filters.risk_level]);

  return { scores, loading, error };
}