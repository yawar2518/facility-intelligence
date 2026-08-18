import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export function useFacilitySLA() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        setLoading(true);
        const response = await apiClient.get('/monitoring/facilities/sla/');
        if (!cancelled) setFacilities(response.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    const interval = setInterval(fetch, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { facilities, loading, error };
}