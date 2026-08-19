import DeviceTile from './DeviceTile'

function LaneRow({ lane, areaName, onDeviceClick, isLast }) {

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
