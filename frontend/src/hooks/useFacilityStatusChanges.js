import { useState, useEffect } from 'react'
import { getFacilityStatusChanges } from '../api/monitoring'

export function useFacilityStatusChanges(facilityId, limit = 50) {
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!facilityId) return

    async function fetchChanges() {
      setLoading(true)
      setError(null)

      try {
        const response = await getFacilityStatusChanges(facilityId, limit)
        setChanges(response.data.changes)
      } catch (err) {
        setError('Failed to load status changes')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchChanges()
  }, [facilityId, limit])

  return { changes, loading, error }
}