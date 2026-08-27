import { useState, useEffect, useCallback } from 'react'
import { useFacilities } from '../hooks/useFacilities'
import { useFacilityStatusChanges } from '../hooks/useFacilityStatusChanges'
import { useLiveEventListener } from '../hooks/useLiveUpdates'
import StatusChangeRow from '../components/Timeline/StatusChangeRow'
import Dropdown from '../components/Dropdown'

const MOBILE_STYLES = `
  @media (max-width: 768px) {
    .tl-header {
      padding: 10px 16px !important;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tl-content {
      padding: 24px 16px 60px !important;
    }
    .tl-title {
      font-size: 26px !important;
    }
  }
`

// A shimmering placeholder block — the same skeletonPulse animation
// used across the rest of the app in place of bare "Loading..." text.
function Skeleton({ width, height = '1em', style }) {
  return (
    <span
      className="skeleton"
      style={{ display: 'inline-block', width, height, ...style }}
    />
  )
}

// Mirrors StatusChangeRow's exact layout (time column, dot + connecting
// line, device code + status pills + description) so there's no size
// jump once real rows replace it.
function SkeletonTimelineRow({ isLast, delay }) {
  return (
    <div className="fade-in" style={{ display: 'flex', gap: '18px', animationDelay: `${delay}s` }}>
      <div style={{ width: '58px', flex: 'none', paddingTop: '2px' }}>
        <Skeleton width="46px" height="12px" />
      </div>

      <div style={{ width: '10px', flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Skeleton width="10px" height="10px" style={{ borderRadius: '50%', marginTop: '4px', flex: 'none' }} />
        {!isLast && (
          <div style={{ width: '2px', flex: 1, background: 'var(--border-2)', marginTop: '6px' }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? '4px' : '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Skeleton width="52px" height="13px" />
          <Skeleton width="58px" height="16px" style={{ borderRadius: '4px' }} />
          <Skeleton width="58px" height="16px" style={{ borderRadius: '4px' }} />
        </div>
        <Skeleton width="65%" height="12px" />
      </div>
    </div>
  )
}

// Each row only shows a bare time (e.g. "14:02:31") — fine within a
// single day, ambiguous once the list spans more than one, which it
// routinely does now that "Load more" can page back through days of
// history. This groups rows under a date header wherever the calendar
// day actually changes, so the date is stated once per day instead of
// nowhere at all.
function formatDayLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const sameDay = (a, b) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function TimelinePage() {
  const [selectedFacilityId, setSelectedFacilityId] = useState(null)
  const { facilities, loading: facilitiesLoading } = useFacilities()
  const { changes, setChanges, loading, loadingMore, hasMore, error, loadMore } = useFacilityStatusChanges(selectedFacilityId)

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

  return (
    <>
      <style>{MOBILE_STYLES}</style>

      {/* Header Bar */}
      <div className="tl-header" style={{
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
          whiteSpace: 'nowrap',
        }}>
          TIMELINE <span style={{ color: 'var(--text-light)' }}>/</span> STATUS CHANGES
        </div>

        {/* Facility Selector */}
        {facilitiesLoading ? (
          <span style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--surface)', border: '1px solid var(--border-strong)',
            borderRadius: '7px', padding: '7px 12px',
          }}>
            <Skeleton width="140px" height="13px" />
          </span>
        ) : (
          <Dropdown
            value={selectedFacilityId || ''}
            onChange={setSelectedFacilityId}
            options={facilities.map(f => ({ value: f.id, label: `${f.name} · ${f.code}` }))}
            placeholder="Select Facility"
            width="220px"
          />
        )}
      </div>

      {/* Main Content */}
      <div className="fade-in tl-content" style={{
        flex: 1,
        overflow: 'auto',
        scrollBehavior: 'smooth',
        padding: '32px 34px 60px',
      }}>

        <h1 className="tl-title" style={{
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
          Every ONLINE / OFFLINE / DEGRADED transition, newest first.
        </p>

        {/* Empty */}
        {!selectedFacilityId && !facilitiesLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>Select a facility to view events</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              margin: '0 0 16px',
            }}>
              <Skeleton width="70px" height="10px" />
              <span style={{ flex: 1, height: '1px', background: 'var(--border-2)' }} />
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonTimelineRow key={i} isLast={i === 4} delay={i * 0.05} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && <p style={{ fontSize: '12px', color: 'var(--offline)' }}>{error}</p>}

        {/* Timeline */}
        {!loading && changes.length > 0 && (
          <div>
            {changes.map((change, i) => {
              const dayLabel = formatDayLabel(change.changed_at)
              const isNewDay = i === 0 || dayLabel !== formatDayLabel(changes[i - 1].changed_at)

              return (
                <div key={change.id}>
                  {isNewDay && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      margin: i === 0 ? '0 0 16px' : '24px 0 16px',
                    }}>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '10px',
                        letterSpacing: '0.14em',
                        color: 'var(--text-3)',
                        flex: 'none',
                      }}>
                        {dayLabel.toUpperCase()}
                      </span>
                      <span style={{ flex: 1, height: '1px', background: 'var(--border-2)' }} />
                    </div>
                  )}
                  <StatusChangeRow
                    change={change}
                    index={i}
                    isLast={i === changes.length - 1 && !hasMore}
                  />
                </div>
              )
            })}

            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '20px' }}>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11.5px',
                    color: 'var(--text-2)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '7px',
                    padding: '8px 18px',
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (loadingMore) return
                    e.currentTarget.style.background = 'var(--text-1)'
                    e.currentTarget.style.color = 'var(--bg)'
                  }}
                  onMouseLeave={(e) => {
                    if (loadingMore) return
                    e.currentTarget.style.background = 'var(--surface)'
                    e.currentTarget.style.color = 'var(--text-2)'
                  }}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}

            {loadingMore && (
              <div style={{ marginTop: '20px' }}>
                {[0, 1, 2].map((i) => (
                  <SkeletonTimelineRow key={i} isLast={i === 2} delay={i * 0.05} />
                ))}
              </div>
            )}
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