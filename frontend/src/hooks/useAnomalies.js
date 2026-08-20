import { useState, useEffect, useCallback } from 'react'
import { getAnomalies, acknowledgeAnomaly as acknowledgeAnomalyApi } from '../api/monitoring'

export default function useAnomalies(filters = {}) {
  const [anomalies, setAnomalies] = useState([])
  // The API paginates at 50 per page — `count` is the true total, which
  // matters for a "how many are there" badge even though the loaded
  // `anomalies` array itself is capped at one page.
  const [totalCount, setTotalCount] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const fetchAnomalies = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAnomalies(filters)
      setAnomalies(data.results ?? data)
      setTotalCount(typeof data.count === 'number' ? data.count : (data.results ?? data).length)
    } catch (err) {
      setError('Failed to load anomalies')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => {
    fetchAnomalies()

    // Refresh every 60 seconds
    const interval = setInterval(fetchAnomalies, 60000)
    return () => clearInterval(interval)
  }, [fetchAnomalies])

  const acknowledgeAnomaly = useCallback(async (anomalyId) => {
    await acknowledgeAnomalyApi(anomalyId)
    setAnomalies(prev => prev.map(a =>
      a.id === anomalyId ? { ...a, is_acknowledged: true } : a
    ))
  }, [])

  return { anomalies, setAnomalies, totalCount, loading, error, refetch: fetchAnomalies, acknowledgeAnomaly }
}
