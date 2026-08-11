import { useState } from 'react'
import LaneRow from './LaneRow'

function AreaPanel({ area, onDeviceClick }) {
  const [isOpen, setIsOpen] = useState(true)

  const allDevices = area.lanes.flatMap(l => l.devices)
  const offlineCount = allDevices.filter(d => d.status === 'OFFLINE').length
  const areaHealth = allDevices.length > 0
    ? Math.round(((allDevices.length - offlineCount) / allDevices.length) * 100)
    : 100

  const healthColor = areaHealth >= 90 ? '#22C55E' : areaHealth >= 70 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{
      marginBottom: '8px',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'var(--surface)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '11px',
            color: 'var(--text-3)',
            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            display: 'inline-block',
            transition: 'transform 150ms ease',
          }}>▾</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)' }}>
              {area.name}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>
              {area.code} · {allDevices.length} devices
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: healthColor }}>
            {areaHealth}%
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            cap. {area.capacity}
          </span>
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div style={{
          padding: '12px 16px 16px',
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
        }}>
          {area.lanes.map(lane => (
            <LaneRow
              key={lane.id}
              lane={lane}
              onDeviceClick={onDeviceClick}
            />
          ))}
        </div>
      )}

    </div>
  )
}

export default AreaPanel