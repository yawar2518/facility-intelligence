import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

export function useAlertLogs(filters = {}) {
  const [logs, setLogs]           = useState([]);
  // The API paginates at 50/page — `totalCount` is the true total, which
  // matters for a "how many are there" readout even though `logs` itself
  // is capped at one page.
  const [totalCount, setTotalCount] = useState(null);
  const [stats, setStats]         = useState({ sent_24h: null, failed_24h: null });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);

      const response = await apiClient.get(`/alert-logs/?${params.toString()}`);
      const data = response.data;
      setLogs(data.results ?? data);
      setTotalCount(typeof data.count === 'number' ? data.count : (data.results ?? data).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters.status]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/alert-logs/stats/');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load alert log stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    // Self-heals the list if a WebSocket event was ever missed (e.g. a
    // brief disconnect) — live updates are the primary path, this is the
    // fallback, same pattern as the unacknowledged-anomaly tally.
    const interval = setInterval(fetchLogs, 60000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { logs, setLogs, totalCount, stats, setStats, loading, error, refetch: fetchLogs };
}
