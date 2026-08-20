import { TrendingUp } from 'lucide-react'
import DeviceTile from './DeviceTile'

function LaneRow({ lane, areaName, onDeviceClick, onForecastClick, isLast }) {

  const laneTypeBadge = {
    ENTRY:      { bg: 'rgba(31, 158, 122, 0.1)', color: 'var(--online)' },
    EXIT:       { bg: 'rgba(191, 90, 47, 0.1)', color: 'var(--accent)' },
    PAY:        { bg: 'rgba(33, 29, 23, 0.07)', color: 'var(--text-2)' },
    ENTRY_EXIT: { bg: 'rgba(33, 29, 23, 0.07)', color: 'var(--text-2)' },
  }

  const badge = laneTypeBadge[lane.lane_type] || { bg: 'rgba(33, 29, 23, 0.07)', color: 'var(--text-2)' }

  return (
    <div style={{ marginBottom: isLast ? 0 : '16px' }}>

      {/* Lane header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '9px',
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          color: 'var(--text-3)',
          width: '40px',
        }}>
          {lane.code || lane.name.split(' ')[0]}
        </span>

        <span style={{
          fontSize: '12.5px',
          fontWeight: 500,
        }}>
          {lane.name}
        </span>

        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '8.5px',
          letterSpacing: '0.1em',
          color: badge.color,
          background: badge.bg,
          padding: '2px 6px',
          borderRadius: '4px',
        }}>
          {lane.lane_type}
        </span>

        {/* Forecast is per-lane, not per-device — one trigger here
            instead of the same chart repeated inside every device tile
            below. */}
        {onForecastClick && (
          <button
            type="button"
            onClick={() => onForecastClick({ id: lane.id, name: lane.name, code: lane.code, area_name: areaName })}
            title="View traffic forecast"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginLeft: 'auto',
              background: 'none',
              border: '1px solid var(--border-2)',
              borderRadius: '5px',
              padding: '3px 7px',
              cursor: 'pointer',
              color: 'var(--text-3)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9.5px',
              transition: 'all 150ms ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent)'
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.background = 'rgba(191, 90, 47, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-3)'
              e.currentTarget.style.borderColor = 'var(--border-2)'
              e.currentTarget.style.background = 'none'
            }}
          >
            <TrendingUp size={11} />
            Forecast
          </button>
        )}
      </div>

      {/* Device grid */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        {lane.devices.map(device => (
          <DeviceTile
            key={device.id}
            device={device}
            onClick={() => onDeviceClick({ ...device, lane_id: lane.id, lane_name: lane.name, area_name: areaName })}
          />
        ))}
      </div>

    </div>
  )
}

export default LaneRow
