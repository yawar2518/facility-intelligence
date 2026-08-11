function DeviceTile({ device, onClick }) {

  const statusBorder = {
    ONLINE:      'var(--online)',
    OFFLINE:     'var(--offline)',
    DEGRADED:    'var(--degraded)',
    UNKNOWN:     'var(--unknown)',
    MAINTENANCE: 'var(--text-3)',
  }

  const statusDot = {
    ONLINE:      'var(--online)',
    OFFLINE:     'var(--offline)',
    DEGRADED:    'var(--degraded)',
    UNKNOWN:     'var(--unknown)',
    MAINTENANCE: 'var(--text-3)',
  }

  const statusLabel = {
    ONLINE:      'var(--online)',
    OFFLINE:     'var(--offline)',
    DEGRADED:    'var(--degraded)',
    UNKNOWN:     'var(--unknown)',
    MAINTENANCE: 'var(--text-3)',
  }

  const deviceTypeShort = {
    BARRIER_GATE:     'Gate',
    LPR_CAMERA:       'Camera',
    KIOSK:            'Kiosk',
    INTERCOM:         'Intercom',
    TICKET_DISPENSER: 'Dispenser',
    SENSOR:           'Sensor',
  }

  const border = statusBorder[device.status] || statusBorder.UNKNOWN
  const dot = statusDot[device.status] || statusDot.UNKNOWN
  const label = statusLabel[device.status] || statusLabel.UNKNOWN

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${border}`,
        borderRadius: '6px',
        padding: '12px',
        cursor: 'pointer',
        position: 'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-2)'}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.borderLeftColor = border
      }}
    >
      {/* Top row — code and dot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--text-1)',
        }}>
          {device.code}
        </span>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: dot,
          flexShrink: 0,
        }}/>
      </div>

      {/* Device type */}
      <p style={{
        fontSize: '11px',
        color: 'var(--text-3)',
        marginBottom: '4px',
      }}>
        {deviceTypeShort[device.device_type] || device.device_type}
      </p>

      {/* Status */}
      <p style={{
        fontSize: '11px',
        fontWeight: 500,
        color: label,
      }}>
        {device.status}
      </p>

    </div>
  )
}

export default DeviceTile