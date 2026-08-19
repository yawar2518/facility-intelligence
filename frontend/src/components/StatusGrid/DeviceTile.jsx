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
    BARRIER_GATE:     'Barrier Gate',
    LPR_CAMERA:       'Camera',
    KIOSK:            'Kiosk',
    INTERCOM:         'Intercom',
    TICKET_DISPENSER: 'Dispenser',
    SENSOR:           'Sensor',
  }

  const border = statusBorder[device.status] || statusBorder.UNKNOWN
  const dot = statusDot[device.status] || statusDot.UNKNOWN
  const label = statusLabel[device.status] || statusLabel.UNKNOWN

  const isDegraded = device.status === 'DEGRADED'
  const isOffline = device.status === 'OFFLINE'

  return (
    <div
      onClick={onClick}
      style={{
        width: '158px',
        background: 'var(--surface-white)',
        border: isDegraded
          ? '2px solid var(--degraded)'
          : isOffline
          ? '1px solid rgba(33, 29, 23, 0.1)'
          : '1px solid rgba(33, 29, 23, 0.1)',
        borderLeft: `3px solid ${border}`,
        borderRadius: '8px',
        padding: '11px 12px',
        cursor: 'pointer',
        boxShadow: isDegraded ? '0 0 0 4px rgba(194, 133, 26, 0.08)' : 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = isDegraded ? 'var(--degraded)' : 'rgba(33, 29, 23, 0.32)'
        e.currentTarget.style.borderLeftColor = border
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isDegraded ? 'var(--degraded)' : 'rgba(33, 29, 23, 0.1)'
        e.currentTarget.style.borderLeftColor = border
      }}
    >
      {/* Top row — code and dot */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '5px',
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '12px',
          fontWeight: 500,
        }}>
          {device.code}
        </span>
        <span style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: dot,
          animation: device.status === 'ONLINE'
            ? 'breathe 3s ease-in-out infinite'
            : isDegraded
            ? 'pulseA 2.4s infinite'
            : 'none',
          flexShrink: 0,
        }}/>
      </div>

      {/* Device type */}
      <div style={{
        fontSize: '10.5px',
        color: 'var(--text-3)',
        marginBottom: '3px',
      }}>
        {deviceTypeShort[device.device_type] || device.device_type}
      </div>

      {/* Status */}
      <div style={{
        fontSize: '11px',
        fontWeight: isDegraded ? 600 : 500,
        color: label,
      }}>
        {device.status}
      </div>

    </div>
  )
}

export default DeviceTile
