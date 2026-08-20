import { useState } from 'react';
import api from '../api/client';

/**
 * Fetches unified playback data for a facility over a time window.
 * No auto-fetch — the page calls refetch() explicitly.
 */
export function usePlayback() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

async function refetch(facilityId, startISO, endISO, bucketMinutes = 5) {
  if (!facilityId) return;

  setLoading(true);
  setError(null);

  try {
    const params = new URLSearchParams({
      start:          startISO,
      end:            endISO,
      bucket_minutes: bucketMinutes,
    });

    const url = `/monitoring/facilities/${facilityId}/playback/?${params}`;

    const resp = await api.get(url);
    setData(resp.data);
  } catch (err) {
    setError(err.response?.data?.error || 'Failed to load playback data');
  } finally {
    setLoading(false);
  }
}
  return { data, loading, error, refetch };
}