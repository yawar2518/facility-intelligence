import { useState, useEffect } from 'react'
import { getDeviceUptime } from '../api/monitoring'

export function useDeviceDetail(deviceId) {
  const [uptime, setUptime] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!deviceId) {
      // Panel closed — reset state
      setUptime(null)
      return
    }

    async function fetchUptime() {
      setLoading(true)
      setError(null)

      try {
        const response = await getDeviceUptime(deviceId, 7)
        setUptime(response.data)
      } catch (err) {
        setError('Failed to load device details')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchUptime()
  }, [deviceId])

  return { uptime, loading, error }
}