import { useState, useEffect, useCallback } from 'react'
import { getAnomalies } from '../api/monitoring'

export default function useAnomalies(filters = {}) {
  const [anomalies, setAnomalies] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const fetchAnomalies = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAnomalies(filters)
      setAnomalies(data.results ?? data)
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

  return { anomalies, loading, error, refetch: fetchAnomalies }
}