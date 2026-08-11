import { useFacilities } from '../hooks/useFacilities'
import { useState, useEffect } from 'react'
import FacilityCard from '../components/FacilityCard'
import { getFacilityStatusChanges } from '../api/monitoring'

function DashboardPage() {
  const { facilities, loading, error } = useFacilities()
  const [recentChanges, setRecentChanges] = useState([])

  // Fetch recent events from all facilities combined
  useEffect(() => {
    if (!facilities.length) return

    async function fetchAllChanges() {
      try {
        const allChanges = await Promise.all(
          facilities.map(f => getFacilityStatusChanges(f.id, 10))
        )
        const combined = allChanges
          .flatMap(r => r.data.changes)
          .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
          .slice(0, 8)
        setRecentChanges(combined)
      } catch (err) {
        console.error(err)
      }
    }

    fetchAllChanges()
  }, [facilities])

  const statusColor = {
    ONLINE:   'var(--online)',
    OFFLINE:  'var(--offline)',
    DEGRADED: 'var(--degraded)',
    UNKNOWN:  'var(--unknown)',
  }

  const formatTime = (iso) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  }

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Page header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>
          Overview
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          Live health across all monitored facilities
        </p>
      </div>

      {loading && <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Loading...</p>}
      {error && <p style={{ fontSize: '12px', color: '#EF4444' }}>{error}</p>}

      {/* Facility cards */}
      {!loading && !error && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '32px',
        }}>
          {facilities.map(facility => (
            <FacilityCard key={facility.id} facility={facility} />
          ))}
        </div>
      )}

      {/* Recent events */}
      {recentChanges.length > 0 && (
        <div>
          <p style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-3)',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            Recent Events
          </p>

          <div style={{
            border: '1px solid var(--border)',
            borderRadius: '6px',
            overflow: 'hidden',
          }}>
            {recentChanges.map((change, i) => (
              <div
                key={change.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '10px 16px',
                  borderBottom: i < recentChanges.length - 1 ? '1px solid var(--border)' : 'none',
                  background: 'var(--surface)',
                }}
              >
                {/* Status dot */}
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: statusColor[change.new_status] || '#3A3A3A',
                  flexShrink: 0,
                }}/>

                {/* Device code */}
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '12px',
                  color: 'var(--text-1)',
                  width: '60px',
                  flexShrink: 0,
                }}>
                  {change.device_code}
                </span>

                {/* Transition */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <span style={{ fontSize: '11px', color: statusColor[change.previous_status] || '#3A3A3A' }}>
                    {change.previous_status}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>→</span>
                  <span style={{ fontSize: '11px', color: statusColor[change.new_status] || '#3A3A3A' }}>
                    {change.new_status}
                  </span>
                </div>

                {/* Location */}
                <span style={{ fontSize: '11px', color: 'var(--text-3)', flex: 1 }}>
                  {change.area_name} · {change.lane_name}
                </span>

                {/* Time */}
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '11px',
                  color: 'var(--text-3)',
                  flexShrink: 0,
                }}>
                  {formatDate(change.changed_at)} {formatTime(change.changed_at)}
                </span>

              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

export default DashboardPage