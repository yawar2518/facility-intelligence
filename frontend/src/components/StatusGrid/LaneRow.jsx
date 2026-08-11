import DeviceTile from './DeviceTile'

function LaneRow({ lane, onDeviceClick }) {

  const laneTypeBadge = {
    ENTRY:      { bg: '#0D1F3C', color: '#4F8EF7' },
    EXIT:       { bg: '#1C0D2E', color: '#A855F7' },
    PAY:        { bg: '#1F1500', color: '#F59E0B' },
    ENTRY_EXIT: { bg: '#0D2318', color: '#22C55E' },
  }

  const badge = laneTypeBadge[lane.lane_type] || { bg: '#1A1A1A', color: '#888' }

  return (
    <div style={{ marginBottom: '16px' }}>

      {/* Lane header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-2)' }}>
          {lane.name}
        </span>
        <span style={{
          fontSize: '10px',
          fontWeight: 500,
          padding: '2px 7px',
          borderRadius: '4px',
          background: badge.bg,
          color: badge.color,
          letterSpacing: '0.5px',
        }}>
          {lane.lane_type}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
          {lane.devices.length} device{lane.devices.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Device grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: '8px',
      }}>
        {lane.devices.map(device => (
          <DeviceTile
            key={device.id}
            device={device}
            onClick={() => onDeviceClick(device)}
          />
        ))}
      </div>

    </div>
  )
}

export default LaneRow