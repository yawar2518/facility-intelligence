import { useState, useEffect, useCallback } from 'react'
import { useFacilities } from '../hooks/useFacilities'
import { useFacilityStatusChanges } from '../hooks/useFacilityStatusChanges'
import { useLiveEventListener } from '../hooks/useLiveUpdates'
import StatusChangeRow from '../components/Timeline/StatusChangeRow'

function TimelinePage() {
  const [selectedFacilityId, setSelectedFacilityId] = useState(null)
  const { facilities, loading: facilitiesLoading } = useFacilities()
  const { changes, setChanges, loading, error } = useFacilityStatusChanges(selectedFacilityId, 100)

  // Default to the first facility, same as Status Grid — the page should
  // land with real data showing, not an empty "pick one" state.
  useEffect(() => {
    if (!selectedFacilityId && facilities.length > 0 && !facilitiesLoading) {
      setSelectedFacilityId(facilities[0].id)
    }
  }, [facilities, facilitiesLoading, selectedFacilityId])

  // Live device-status events (from the shared connection in Layout) —
  // prepend the ones for the facility we're currently viewing instead of
  // only ever seeing history from whenever the page was last loaded.
  useLiveEventListener(useCallback((event) => {
    if (event.facility_id !== selectedFacilityId) return

    setChanges((prev) => {
      if (event.change_id && prev.some(c => c.id === event.change_id)) return prev
      const newChange = {
        id: event.change_id || `${event.device_id}-${event.changed_at}`,
        device_code: event.device_code,
        area_name: event.area_name,
        lane_name: event.lane_name,
        previous_status: event.previous_status,
        new_status: event.new_status,
        reason: event.reason,
        changed_at: event.changed_at,
        duration_seconds: event.duration_seconds,
        metadata: event.metadata || {},
      }
      return [newChange, ...prev]
    })
  }, [selectedFacilityId, setChanges]))

  const selectedFacility = facilities.find(f => f.id === selectedFacilityId)

  const today = new Date()
  const dateLabel = `${today.toLocaleDateString('en-GB', { weekday: 'long' })} `
    + `${today.getDate()} ${today.toLocaleDateString('en-GB', { month: 'long' })}`

  return (
    <>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 34px',
        borderBottom: '1px solid var(--border)',
        flex: 'none',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: 'var(--text-4)',
        }}>
          TIMELINE <span style={{ color: 'var(--text-light)' }}>/</span> STATUS CHANGES
        </div>

        {/* Facility Selector */}
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '12px',
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: '7px',
          padding: '6px 12px',
          cursor: 'pointer',
          position: 'relative',
        }}>
          {facilitiesLoading ? (
            'Loading...'
          ) : (
            <>
              <select
                value={selectedFacilityId || ''}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                }}
              >
                {facilities.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} · {f.code}
                  </option>
                ))}
              </select>
              {selectedFacility?.name || 'Select Facility'} · {selectedFacility?.code || ''}
              <span style={{ color: 'var(--accent)' }}>▾</span>
            </>
          )}
        </span>
      </div>

      {/* Main Content */}
      <div className="fade-in" style={{
        flex: 1,
        overflow: 'auto',
        scrollBehavior: 'smooth',
        padding: '32px 34px 60px',
      }}>

        <h1 style={{
          fontFamily: 'Archivo, sans-serif',
          fontWeight: 800,
          fontSize: '34px',
          margin: '0 0 6px',
          letterSpacing: '-0.02em',
        }}>
          Timeline
        </h1>
        <p style={{
          fontSize: '13px',
          color: 'var(--text-2)',
          margin: '0 0 32px',
        }}>
          Every ONLINE / OFFLINE / DEGRADED transition, newest first. {dateLabel}.
        </p>

        {/* Empty */}
        {!selectedFacilityId && !facilitiesLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>Select a facility to view events</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>Loading...</p>
          </div>
        )}

        {/* Error */}
        {error && <p style={{ fontSize: '12px', color: 'var(--offline)' }}>{error}</p>}

        {/* Timeline */}
        {!loading && changes.length > 0 && (
          <div>
            {changes.map((change, i) => (
              <StatusChangeRow
                key={change.id}
                change={change}
                index={i}
                isLast={i === changes.length - 1}
              />
            ))}
          </div>
        )}

        {/* No results */}
        {selectedFacilityId && !loading && changes.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>No events recorded yet</p>
          </div>
        )}

      </div>
    </>
  )
}

export default TimelinePage
