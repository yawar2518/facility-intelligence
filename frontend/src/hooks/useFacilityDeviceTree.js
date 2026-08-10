import { useState, useEffect } from 'react'
import { getFacilityDeviceTree } from '../api/monitoring'

export function useFacilityDeviceTree(facilityId) {
  const [tree, setTree] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // If no facility selected yet, do nothing
    if (!facilityId) return

    async function fetchTree() {
      setLoading(true)
      setError(null)

      try {
        const response = await getFacilityDeviceTree(facilityId)
        setTree(response.data)
      } catch (err) {
        setError('Failed to load device tree')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchTree()
  }, [facilityId])
  // facilityId in the dependency array means:
  // re-run this effect whenever facilityId changes
  // that's how selecting a different facility triggers a new fetch

  return { tree, setTree, loading, error }
}