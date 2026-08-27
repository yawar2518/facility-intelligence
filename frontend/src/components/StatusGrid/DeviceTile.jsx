// Mobile: tiles grow to fill the row in pairs via flex on the parent
// (LaneRow sets flexWrap: wrap; each tile uses flex: 1 1 140px so two
// fit side-by-side on 390px and three on wider screens — same as desktop).
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

  // Every status gets a fully colored border now, not just a colored
  // accent stripe on the left with an otherwise neutral-gray tile —
  // ONLINE reads as a calm, translucent tint of its color since it's
  // the "nothing to see here" state, while DEGRADED/OFFLINE stay bold
  // and full-saturation (plus a glow) since those need attention.
  const tileBorder = {
    ONLINE:      { color: 'rgba(31, 158, 122, 0.45)', weight: '1.5px', glow: null },
    DEGRADED:    { color: 'var(--degraded)',          weight: '2px',   glow: '0 0 0 4px rgba(194, 133, 26, 0.08)' },
    OFFLINE:     { color: 'var(--offline)',           weight: '2px',   glow: '0 0 0 4px rgba(204, 59, 48, 0.08)' },
    UNKNOWN:     { color: 'rgba(168, 158, 141, 0.5)', weight: '1.5px', glow: null },
    MAINTENANCE: { color: 'rgba(107, 99, 87, 0.4)',   weight: '1.5px', glow: null },
  }

  const border = statusBorder[device.status] || statusBorder.UNKNOWN
  const dot    = statusDot[device.status]    || statusDot.UNKNOWN
  const label  = statusLabel[device.status]  || statusLabel.UNKNOWN
  const tile   = tileBorder[device.status]   || tileBorder.UNKNOWN

  const isDegraded = device.status === 'DEGRADED'

  return (
    <div
      onClick={onClick}
      style={{
        // flex: 1 1 140px means tiles grow to fill a row in pairs on
        // mobile (358px content width → two 169px tiles) and in rows of
        // three or more on desktop — without changing the visual design.
        flex: '1 1 140px',
        minWidth: '130px',
        background: 'var(--surface-white)',
        border: `${tile.weight} solid ${tile.color}`,
        borderLeft: `3px solid ${border}`,
        borderRadius: '8px',
        padding: '11px 12px',
        cursor: 'pointer',
        boxShadow: tile.glow || 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = border
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = tile.color
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