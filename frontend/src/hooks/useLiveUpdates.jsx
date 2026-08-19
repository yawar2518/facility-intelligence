import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useFacilities } from './useFacilities'
import useAnomalies from './useAnomalies'

const LiveUpdatesContext = createContext(null)
const MAX_VISIBLE_TOASTS = 4

/**
 * One shared WebSocket connection per facility, opened once for the whole
 * app (mounted in Layout, so it lives above every page) instead of each
 * page opening its own. This is what makes toasts show up consistently no
 * matter which page you're on, and gives any page a single place to listen
 * for live device-status and anomaly events to keep its own data in sync.
 */
export function LiveUpdatesProvider({ children }) {
  const { facilities } = useFacilities()
  // Seeds the live-tracked unacknowledged count from the true paginated
  // total (not just the one page of anomalies this hook loads) — the same
  // periodic poll also self-heals the tally if a WebSocket event was ever
  // missed (e.g. a brief disconnect).
  const { totalCount: unacknowledgedTotal } = useAnomalies({ is_acknowledged: false })

  const [toasts, setToasts] = useState([])
  const [offlineByFacility, setOfflineByFacility] = useState({})
  const [unacknowledgedAnomalyCount, setUnacknowledgedAnomalyCount] = useState(null)
  const listenersRef = useRef(new Set())

  useEffect(() => {
    if (unacknowledgedTotal !== null) {
      setUnacknowledgedAnomalyCount(unacknowledgedTotal)
    }
  }, [unacknowledgedTotal])

  // Seed each facility's offline tally from its initial health fetch, once,
  // the first time we see it — live events patch it from there.
  useEffect(() => {
    if (!facilities.length) return
    setOfflineByFacility((prev) => {
      let changed = false
      const next = { ...prev }
      facilities.forEach((f) => {
        if (!(f.id in next)) {
          next[f.id] = f.health?.offline || 0
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [facilities.map(f => f.id).join(',')])

  useEffect(() => {
    if (!facilities.length) return

    const sockets = facilities.map((facility) => {
      const ws = new WebSocket(`ws://localhost:8000/ws/facility/${facility.id}/`)

      ws.onmessage = (e) => {
        const update = JSON.parse(e.data)

        if (update.kind === 'alert_log_created') {
          const event = { ...update, facility_id: update.facility_id || facility.id }
          listenersRef.current.forEach((listener) => listener(event))
          return
        }

        if (update.kind === 'anomaly_created') {
          const event = { ...update, facility_id: update.facility_id || facility.id }
          listenersRef.current.forEach((listener) => listener(event))
          setUnacknowledgedAnomalyCount((prev) => (prev == null ? 1 : prev + 1))
          return
        }

        if (update.kind === 'anomaly_acknowledged') {
          const event = { ...update, facility_id: update.facility_id || facility.id }
          listenersRef.current.forEach((listener) => listener(event))
          setUnacknowledgedAnomalyCount((prev) => (prev == null ? 0 : Math.max(0, prev - 1)))
          return
        }

        // Device-status event — the raw payload has no facility_id, but
        // since we open one socket per facility, we already know which one
        // this came from.
        const event = {
          ...update,
          facility_id: facility.id,
          facility_name: update.facility_name || facility.name,
        }

        listenersRef.current.forEach((listener) => listener(event))

        if (event.previous_status === 'OFFLINE' || event.new_status === 'OFFLINE') {
          setOfflineByFacility((prev) => {
            const current = prev[facility.id] || 0
            let delta = 0
            if (event.previous_status === 'OFFLINE') delta -= 1
            if (event.new_status === 'OFFLINE') delta += 1
            return { ...prev, [facility.id]: Math.max(0, current + delta) }
          })
        }

        const detail = [event.facility_name, event.lane_name, 'just now']
          .filter(Boolean).join(' · ')

        let toast = null
        if (event.new_status === 'OFFLINE') {
          toast = { type: 'error', title: `${event.device_code} went`, statusText: 'OFFLINE', detail }
        } else if (event.new_status === 'DEGRADED') {
          toast = { type: 'warning', title: `${event.device_code} is`, statusText: 'DEGRADED', detail }
        } else if (event.previous_status !== 'ONLINE' && event.new_status === 'ONLINE') {
          toast = { type: 'success', title: `${event.device_code} is back`, statusText: 'ONLINE', detail }
        }

        // Cap the stack — a burst of simultaneous events (e.g. a facility's
        // whole simulator going quiet) shouldn't flood the entire screen.
        if (toast) {
          const id = `${event.device_id}-${event.changed_at}`
          setToasts((prev) => [...prev.slice(-(MAX_VISIBLE_TOASTS - 1)), { id, ...toast }])
        }
      }

      ws.onerror = (e) => {
        console.error('WebSocket error:', e)
      }

      return ws
    })

    return () => {
      sockets.forEach((ws) => ws.close())
    }
  }, [facilities.map(f => f.id).join(',')])

  const subscribe = (listener) => {
    listenersRef.current.add(listener)
    return () => listenersRef.current.delete(listener)
  }

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const offlineCount = Object.values(offlineByFacility).reduce((sum, n) => sum + n, 0)

  return (
    <LiveUpdatesContext.Provider value={{
      subscribe,
      toasts,
      dismissToast,
      offlineCount,
      unacknowledgedAnomalyCount,
    }}>
      {children}
    </LiveUpdatesContext.Provider>
  )
}

export function useLiveUpdates() {
  const ctx = useContext(LiveUpdatesContext)
  if (!ctx) {
    throw new Error('useLiveUpdates must be used within a LiveUpdatesProvider')
  }
  return ctx
}

/**
 * Convenience hook for a page that wants to react to live device-status or
 * anomaly events (e.g. patch its own facility/tree/anomaly-list state)
 * without managing its own WebSocket connection. Events carry a `kind`
 * field ('anomaly_created', 'anomaly_acknowledged', or unset for a
 * device-status change) so listeners can branch on what they care about.
 */
export function useLiveEventListener(onEvent) {
  const { subscribe } = useLiveUpdates()

  useEffect(() => {
    return subscribe(onEvent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, onEvent])
}
